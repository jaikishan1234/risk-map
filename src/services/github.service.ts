import { Octokit } from "octokit";
import type {
  Commit,
  Contributor,
  RepositoryMetadata,
  RepositoryTreeEntry,
} from "@/types/repository.types";
import { getOrFetch, MemoryCache } from "@/lib/cache/memory-cache";
import { isBinaryFile } from "@/utils/is-binary-file";

const MAX_CONTRIBUTORS = 20;
const MAX_COMMITS = 1000;
const COMMITS_PER_PAGE = 100;

// GitHub data doesn't change second-to-second; cache each result type for
// 5 minutes so re-analyzing the same repo within a session doesn't re-spend
// API rate limit. Separate caches per method since they have different
// shapes and are fetched independently.
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Thrown for any failure talking to the GitHub API.
 * Callers (API routes) can inspect `status` to decide the HTTP response.
 */
export class GitHubServiceError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "GitHubServiceError";
  }
}

function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

/**
 * All communication with the GitHub API lives here. Nothing outside this
 * service should construct a GitHub API request directly.
 */
export class GitHubService {
  private readonly octokit: Octokit;

  // Keyed by "owner/repo". One cache + in-flight map per method.
  private readonly repositoryCache = new MemoryCache<RepositoryMetadata>(CACHE_TTL_MS);
  private readonly repositoryInFlight = new Map<string, Promise<RepositoryMetadata>>();

  private readonly contributorsCache = new MemoryCache<Contributor[]>(CACHE_TTL_MS);
  private readonly contributorsInFlight = new Map<string, Promise<Contributor[]>>();

  private readonly commitsCache = new MemoryCache<Commit[]>(CACHE_TTL_MS);
  private readonly commitsInFlight = new Map<string, Promise<Commit[]>>();

  private readonly treeCache = new MemoryCache<RepositoryTreeEntry[]>(CACHE_TTL_MS);
  private readonly treeInFlight = new Map<string, Promise<RepositoryTreeEntry[]>>();

  private readonly fileCommitsCache = new MemoryCache<Commit[]>(CACHE_TTL_MS);
  private readonly fileCommitsInFlight = new Map<string, Promise<Commit[]>>();

  constructor(authToken?: string) {
    this.octokit = new Octokit({
      auth: authToken ?? process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Fetches core repository metadata. Cached per "owner/repo" for 5 minutes.
   *
   * @param owner - repository owner/org, e.g. "facebook"
   * @param repo  - repository name, e.g. "react"
   */
  async getRepository(
    owner: string,
    repo: string
  ): Promise<RepositoryMetadata> {
    const key = `${owner}/${repo}`;
    return getOrFetch(this.repositoryCache, this.repositoryInFlight, key, () =>
      this.fetchRepository(owner, repo)
    );
  }

  private async fetchRepository(
    owner: string,
    repo: string
  ): Promise<RepositoryMetadata> {
    try {
      const { data } = await this.octokit.rest.repos.get({ owner, repo });

      return {
        name: data.name,
        description: data.description ?? null,
        stars: data.stargazers_count ?? 0,
        forks: data.forks_count ?? 0,
        language: data.language ?? null,
        lastUpdated: data.updated_at ?? data.pushed_at ?? new Date(0).toISOString(),
      };
    } catch (error) {
      const status = getErrorStatus(error);

      if (status === 404) {
        throw new GitHubServiceError(
          `Repository ${owner}/${repo} not found (it may be private or misspelled).`,
          404
        );
      }
      if (status === 403) {
        throw new GitHubServiceError(
          "GitHub API rate limit exceeded. Try again shortly.",
          403
        );
      }

      throw new GitHubServiceError(
        `Failed to fetch repository metadata for ${owner}/${repo}.`,
        500
      );
    }
  }

  /**
   * Fetches the top contributors by commit count. Cached per "owner/repo"
   * for 5 minutes.
   *
   * @param owner - repository owner/org, e.g. "facebook"
   * @param repo  - repository name, e.g. "react"
   * @returns up to MAX_CONTRIBUTORS contributors, sorted by commitCount desc.
   */
  async getContributors(owner: string, repo: string): Promise<Contributor[]> {
    const key = `${owner}/${repo}`;
    return getOrFetch(
      this.contributorsCache,
      this.contributorsInFlight,
      key,
      () => this.fetchContributors(owner, repo)
    );
  }

  private async fetchContributors(
    owner: string,
    repo: string
  ): Promise<Contributor[]> {
    try {
      const { data } = await this.octokit.rest.repos.listContributors({
        owner,
        repo,
        // GitHub already sorts by contributions desc; over-fetch a bit so
        // that filtering out anonymous entries still leaves a full top 20.
        per_page: 100,
        anon: "false",
      });

      const contributors: Contributor[] = data
        .filter(
          (
            contributor
          ): contributor is typeof contributor & {
            login: string;
            avatar_url: string;
            contributions: number;
          } =>
            contributor.type !== "Anonymous" &&
            typeof contributor.login === "string" &&
            typeof contributor.avatar_url === "string"
        )
        .map((contributor) => ({
          username: contributor.login,
          avatar: contributor.avatar_url,
          commitCount: contributor.contributions,
        }))
        .sort((a, b) => b.commitCount - a.commitCount)
        .slice(0, MAX_CONTRIBUTORS);

      return contributors;
    } catch (error) {
      const status = getErrorStatus(error);

      if (status === 404) {
        throw new GitHubServiceError(
          `Repository ${owner}/${repo} not found (it may be private or misspelled).`,
          404
        );
      }
      if (status === 403) {
        throw new GitHubServiceError(
          "GitHub API rate limit exceeded. Try again shortly.",
          403
        );
      }

      throw new GitHubServiceError(
        `Failed to fetch contributors for ${owner}/${repo}.`,
        500
      );
    }
  }

  /**
   * Fetches the latest commits (default branch), newest first, paginating
   * through the list endpoint until either MAX_COMMITS is reached or the
   * repository runs out of commits — whichever comes first. Cached per
   * "owner/repo" for 5 minutes.
   *
   * @param owner - repository owner/org, e.g. "facebook"
   * @param repo  - repository name, e.g. "react"
   */
  async getCommits(owner: string, repo: string): Promise<Commit[]> {
    const key = `${owner}/${repo}`;
    return getOrFetch(this.commitsCache, this.commitsInFlight, key, () =>
      this.fetchCommits(owner, repo)
    );
  }

  private async fetchCommits(owner: string, repo: string): Promise<Commit[]> {
    try {
      const commits: Commit[] = [];

      const iterator = this.octokit.paginate.iterator(
        this.octokit.rest.repos.listCommits,
        { owner, repo, per_page: COMMITS_PER_PAGE }
      );

      for await (const { data: page } of iterator) {
        for (const item of page) {
          commits.push({
            author:
              item.author?.login ?? item.commit.author?.name ?? "Unknown",
            date:
              item.commit.author?.date ??
              item.commit.committer?.date ??
              new Date(0).toISOString(),
            sha: item.sha,
          });

          if (commits.length >= MAX_COMMITS) break;
        }

        // Stop requesting further pages once we've hit the cap — no reason
        // to pull page 6 from GitHub if we only needed 550 commits from it.
        if (commits.length >= MAX_COMMITS) break;
      }

      return commits;
    } catch (error) {
      const status = getErrorStatus(error);

      // A brand-new repo with zero commits yet — treat as "no commits",
      // not an error.
      if (status === 409) {
        return [];
      }
      if (status === 404) {
        throw new GitHubServiceError(
          `Repository ${owner}/${repo} not found (it may be private or misspelled).`,
          404
        );
      }
      if (status === 403) {
        throw new GitHubServiceError(
          "GitHub API rate limit exceeded. Try again shortly.",
          403
        );
      }

      throw new GitHubServiceError(
        `Failed to fetch commits for ${owner}/${repo}.`,
        500
      );
    }
  }

  /**
   * Fetches the full file tree of the repository's default branch,
   * excluding binary files (images, fonts, archives, compiled artifacts,
   * etc. — see utils/is-binary-file.ts). Cached per "owner/repo" for 5
   * minutes.
   *
   * @param owner - repository owner/org, e.g. "facebook"
   * @param repo  - repository name, e.g. "react"
   */
  async getRepositoryTree(
    owner: string,
    repo: string
  ): Promise<RepositoryTreeEntry[]> {
    const key = `${owner}/${repo}`;
    return getOrFetch(this.treeCache, this.treeInFlight, key, () =>
      this.fetchRepositoryTree(owner, repo)
    );
  }

  private async fetchRepositoryTree(
    owner: string,
    repo: string
  ): Promise<RepositoryTreeEntry[]> {
    try {
      const { data: repoData } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      const { data: treeData } = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: repoData.default_branch,
        recursive: "true",
      });

      const entries: RepositoryTreeEntry[] = treeData.tree
        .filter(
          (
            item
          ): item is typeof item & { path: string; type: string } =>
            typeof item.path === "string" &&
            (item.type === "blob" || item.type === "tree")
        )
        .filter((item) => item.type !== "blob" || !isBinaryFile(item.path))
        .map((item) => ({
          path: item.path,
          type: item.type === "tree" ? "directory" : "file",
          size: item.type === "blob" ? item.size ?? 0 : null,
        }));

      return entries;
    } catch (error) {
      const status = getErrorStatus(error);

      if (status === 404) {
        throw new GitHubServiceError(
          `Repository ${owner}/${repo} not found (it may be private or misspelled).`,
          404
        );
      }
      if (status === 403) {
        throw new GitHubServiceError(
          "GitHub API rate limit exceeded. Try again shortly.",
          403
        );
      }

      throw new GitHubServiceError(
        `Failed to fetch file tree for ${owner}/${repo}.`,
        500
      );
    }
  }

  /**
   * Fetches commit history for a single file path, newest first. Capped at
   * one page (100 commits) rather than paginating fully like getCommits() —
   * this method is meant to be called once per file when building a
   * per-file risk table, so keeping it to a single request per file bounds
   * the total API cost of analyzing many files. 100 commits is almost
   * always enough to see a file's real ownership pattern even if it
   * doesn't capture every commit in a very long-lived file's history.
   * Cached per "owner/repo/path" for 5 minutes.
   *
   * @param owner - repository owner/org, e.g. "facebook"
   * @param repo  - repository name, e.g. "react"
   * @param path  - file path within the repo, e.g. "src/index.ts"
   */
  async getFileCommits(
    owner: string,
    repo: string,
    path: string
  ): Promise<Commit[]> {
    const key = `${owner}/${repo}/${path}`;
    return getOrFetch(
      this.fileCommitsCache,
      this.fileCommitsInFlight,
      key,
      () => this.fetchFileCommits(owner, repo, path)
    );
  }

  private async fetchFileCommits(
    owner: string,
    repo: string,
    path: string
  ): Promise<Commit[]> {
    try {
      const { data } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        path,
        per_page: 100,
      });

      return data.map((item) => ({
        author: item.author?.login ?? item.commit.author?.name ?? "Unknown",
        date:
          item.commit.author?.date ??
          item.commit.committer?.date ??
          new Date(0).toISOString(),
        sha: item.sha,
      }));
    } catch (error) {
      const status = getErrorStatus(error);

      // Empty repo, or a path that no longer exists on the default branch.
      if (status === 409 || status === 404) {
        return [];
      }
      if (status === 403) {
        throw new GitHubServiceError(
          "GitHub API rate limit exceeded. Try again shortly.",
          403
        );
      }

      throw new GitHubServiceError(
        `Failed to fetch commit history for ${owner}/${repo}/${path}.`,
        500
      );
    }
  }
}

/**
 * Shared singleton instance for convenience. Uses GITHUB_TOKEN from env.
 * Import a fresh `new GitHubService(token)` instead if you ever need
 * per-request auth (e.g. a user-supplied token).
 */
export const githubService = new GitHubService();