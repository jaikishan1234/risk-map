import type { Commit } from "@/types/repository.types";
import type {
  CommitAnalytics,
  ContributorCommitStats,
} from "@/types/analytics.types";

/**
 * Computes total commit volume and per-contributor share from a list of
 * commits. Pure and deterministic — same input always produces the same
 * output, no network calls, no randomness, no AI involved. This is the
 * ground truth that any later risk scoring or AI explanation must be
 * consistent with.
 *
 * @param commits - raw commits, typically from GitHubService.getCommits()
 */
export function computeCommitAnalytics(commits: Commit[]): CommitAnalytics {
  const totalCommits = commits.length;

  if (totalCommits === 0) {
    return { totalCommits: 0, contributors: [] };
  }

  const commitCountByAuthor = new Map<string, number>();
  for (const commit of commits) {
    commitCountByAuthor.set(
      commit.author,
      (commitCountByAuthor.get(commit.author) ?? 0) + 1
    );
  }

  const contributors: ContributorCommitStats[] = Array.from(
    commitCountByAuthor.entries()
  )
    .map(([author, commitCount]) => ({
      author,
      commitCount,
      percentage: roundToOneDecimal((commitCount / totalCommits) * 100),
    }))
    .sort((a, b) => b.commitCount - a.commitCount);

  return { totalCommits, contributors };
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}