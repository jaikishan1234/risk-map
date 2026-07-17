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

export type RiskLevel = "critical" | "high" | "medium" | "low" | "unknown";

/**
 * Result of a bus factor calculation:
 * "the minimum number of contributors responsible for 50% of commits."
 * Smaller busFactor = higher concentration risk.
 */
export interface BusFactorResult {
  busFactor: number;
  riskLevel: RiskLevel;
  /** Deterministic, data-grounded description of the result — not AI-generated. */
  explanation: string;
  /** Usernames of the contributors counted toward busFactor, in order. */
  topContributors: string[];
  /** Actual cumulative percentage reached (>= 50, unless there are no commits). */
  cumulativePercentage: number;
  totalCommits: number;
}

/**
 * Inputs to the composite risk score — the four independent signals this
 * app computes, combined into one overall number. `busFactor` is the raw
 * count (e.g. from BusFactorResult.busFactor), not a 0-100 score; the
 * other three are already 0-100 risk scores from their own calculators.
 */
export interface RiskScoreInput {
  busFactor: number;
  concentrationScore: number;
  recencyRisk: number;
  documentationRisk: number;
}

/**
 * Result of combining all four risk signals into one score + tier.
 * `breakdown` exposes each signal's contribution (already normalized to
 * 0-100) so a UI or AI explanation can show *why* the score is what it is,
 * rather than presenting a single opaque number.
 */
export interface CompositeRiskResult {
  overallRiskScore: number;
  riskLevel: RiskLevel;
  breakdown: {
    busFactorRisk: number;
    concentrationScore: number;
    recencyRisk: number;
    documentationRisk: number;
  };
}

/**
 * Full payload for the repository risk dashboard — everything the UI
 * needs in one shape, assembled server-side from the individual
 * lib/analytics/ calculators.
 */
export interface RiskDashboardData {
  overallRiskScore: number;
  riskLevel: RiskLevel;
  busFactor: number;
  busFactorExplanation: string;
  documentationRisk: number;
  totalCommits: number;
  /** Top contributors by commit share, for the distribution chart. */
  contributors: ContributorCommitStats[];
  fileClassification: FileClassificationStats;
  breakdown: CompositeRiskResult["breakdown"];
}

/**
 * Per-file risk entry for the Top Risky Files table.
 */
export interface FileRiskEntry {
  path: string;
  /** Primary owner's username, or null if the file has no commit history. */
  owner: string | null;
  /** 0-100, higher = riskier. See lib/analytics/file-risk.ts. */
  riskScore: number;
  /** ISO 8601 date of the file's most recent commit, or null if none. */
  lastModified: string | null;
}