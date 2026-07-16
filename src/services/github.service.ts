import { Octokit } from "octokit";
import type {
  Commit,
  Contributor,
  RepositoryMetadata,
} from "@/types/repository.types";

const MAX_CONTRIBUTORS = 20;
const MAX_COMMITS = 1000;
const COMMITS_PER_PAGE = 100;

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

  constructor(authToken?: string) {
    this.octokit = new Octokit({
      auth: authToken ?? process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Fetches core repository metadata.
   *
   * @param owner - repository owner/org, e.g. "facebook"
   * @param repo  - repository name, e.g. "react"
   */
  async getRepository(
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
   * Fetches the top contributors by commit count.
   *
   * @param owner - repository owner/org, e.g. "facebook"
   * @param repo  - repository name, e.g. "react"
   * @returns up to MAX_CONTRIBUTORS contributors, sorted by commitCount desc.
   */
  async getContributors(owner: string, repo: string): Promise<Contributor[]> {
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
   * repository runs out of commits — whichever comes first.
   *
   * @param owner - repository owner/org, e.g. "facebook"
   * @param repo  - repository name, e.g. "react"
   */
  async getCommits(owner: string, repo: string): Promise<Commit[]> {
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
}

/**
 * Shared singleton instance for convenience. Uses GITHUB_TOKEN from env.
 * Import a fresh `new GitHubService(token)` instead if you ever need
 * per-request auth (e.g. a user-supplied token).
 */
export const githubService = new GitHubService();