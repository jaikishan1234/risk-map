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

/**
 * Broad category a source file falls into. "other" is a deliberate
 * catch-all for files that don't clearly belong to the four named
 * categories (e.g. LICENSE, .gitattributes) — forcing every file into
 * "code" would misrepresent the classification.
 */
export type FileCategory = "code" | "documentation" | "test" | "config" | "other";

export interface ClassifiedFile {
  path: string;
  category: FileCategory;
}

export interface FileClassificationStats {
  total: number;
  byCategory: Record<FileCategory, number>;
  /** Percentage of total files per category, 0–100, rounded to 1 decimal. */
  percentageByCategory: Record<FileCategory, number>;
}

export interface FileClassificationResult {
  files: ClassifiedFile[];
  stats: FileClassificationStats;
}

/**
 * Ownership breakdown derived from a set of commits. Works on any commit
 * list — the full repository history, or (once per-file commit data
 * exists) a single file's history — since ownership concentration is the
 * same computation either way.
 */
export interface OwnershipAnalysis {
  /** Author with the most commits in the given set, or null if empty. */
  primaryOwner: string | null;
  /** Primary owner's share of total commits, 0–100. 0 if no commits. */
  ownershipPercentage: number;
  totalCommits: number;
  contributorCount: number;
  /** Full breakdown, sorted by commitCount descending. */
  contributors: ContributorCommitStats[];
}