import { Octokit } from "octokit";
import type { Contributor, RepositoryMetadata } from "@/types/repository.types";

const MAX_CONTRIBUTORS = 20;

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
}

/**
 * Shared singleton instance for convenience. Uses GITHUB_TOKEN from env.
 * Import a fresh `new GitHubService(token)` instead if you ever need
 * per-request auth (e.g. a user-supplied token).
 */
export const githubService = new GitHubService();