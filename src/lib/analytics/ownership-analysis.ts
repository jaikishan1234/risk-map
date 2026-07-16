import type { Commit } from "@/types/repository.types";
import type { OwnershipAnalysis } from "@/types/analytics.types";
import { computeCommitAnalytics } from "@/lib/analytics/commit-analytics";

/**
 * Determines the primary owner and ownership concentration from a set of
 * commits. Pure and deterministic — works on any commit list, whether
 * that's an entire repository's history or (once per-file commit data is
 * available) a single file's history, since "who owns this?" is the same
 * computation at either scope.
 *
 * @param commits - commits to analyze, typically from GitHubService.getCommits()
 */
export function analyzeOwnership(commits: Commit[]): OwnershipAnalysis {
  const { totalCommits, contributors } = computeCommitAnalytics(commits);

  const topContributor = contributors[0] ?? null;

  return {
    primaryOwner: topContributor?.author ?? null,
    ownershipPercentage: topContributor?.percentage ?? 0,
    totalCommits,
    contributorCount: contributors.length,
    contributors,
  };
}