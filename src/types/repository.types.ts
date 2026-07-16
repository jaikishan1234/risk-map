/**
 * Normalized repository metadata returned by GitHubService.
 * This is the internal shape the rest of the app depends on —
 * nothing outside GitHubService should touch GitHub's raw API shape.
 */
export interface RepositoryMetadata {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  /** ISO 8601 timestamp of the repository's last push/update. */
  lastUpdated: string;
}

/**
 * A single contributor's identity and commit volume on a repository.
 * Anonymous/non-user contributors (no GitHub account, e.g. squashed
 * co-author entries) are excluded upstream — every Contributor here
 * maps to a real GitHub account.
 */
export interface Contributor {
  username: string;
  avatar: string;
  commitCount: number;
}