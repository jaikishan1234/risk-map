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

/**
 * A single commit's identity metadata (no diff/file content — this is
 * intentionally lightweight since it's fetched up to 1000 at a time).
 */
export interface Commit {
  /** GitHub username if the commit is linked to an account, else the raw
   *  commit author name recorded in git, else "Unknown". */
  author: string;
  /** ISO 8601 commit author date. */
  date: string;
  sha: string;
}

/**
 * A single entry in a repository's file tree. Binary files are excluded
 * upstream by GitHubService.getRepositoryTree() — every "file" entry here
 * is a text/source file safe to analyze.
 */
export interface RepositoryTreeEntry {
  path: string;
  type: "file" | "directory";
  /** Size in bytes. Always null for directories (trees don't report a size). */
  size: number | null;
}