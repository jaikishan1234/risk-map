/**
 * Commit volume and share for a single contributor within one analysis.
 */
export interface ContributorCommitStats {
  author: string;
  commitCount: number;
  /** Percentage of total commits, 0–100, rounded to 1 decimal place. */
  percentage: number;
}

/**
 * Structured output of analyzing a repository's commit list.
 * `contributors` is sorted by commitCount descending.
 */
export interface CommitAnalytics {
  totalCommits: number;
  contributors: ContributorCommitStats[];
}