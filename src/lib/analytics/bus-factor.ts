import type { Commit } from "@/types/repository.types";
import type { BusFactorResult, RiskLevel } from "@/types/analytics.types";
import { computeCommitAnalytics } from "@/lib/analytics/commit-analytics";

const OWNERSHIP_THRESHOLD_PERCENT = 50;

/**
 * Risk level thresholds, keyed by the maximum bus factor that still counts
 * as that level. Kept as an explicit, tunable table rather than buried
 * if/else logic, since these cutoffs are a judgment call worth being able
 * to adjust in one place.
 *   busFactor 1        -> critical (one person leaving takes half the history)
 *   busFactor 2        -> high
 *   busFactor 3-4       -> medium
 *   busFactor 5+        -> low
 */
const RISK_LEVEL_THRESHOLDS: { maxBusFactor: number; level: RiskLevel }[] = [
  { maxBusFactor: 1, level: "critical" },
  { maxBusFactor: 2, level: "high" },
  { maxBusFactor: 4, level: "medium" },
  { maxBusFactor: Infinity, level: "low" },
];

function getRiskLevel(busFactor: number): RiskLevel {
  if (busFactor <= 0) return "unknown";
  const match = RISK_LEVEL_THRESHOLDS.find(
    (tier) => busFactor <= tier.maxBusFactor
  );
  return match?.level ?? "low";
}

/**
 * Calculates bus factor: the minimum number of contributors, taken largest
 * first, whose cumulative commits reach at least 50% of all commits in the
 * given set. Pure and deterministic — no AI, no network calls. Works on
 * any commit list (whole repo, or a single file's history once available).
 *
 * @param commits - commits to analyze, typically from GitHubService.getCommits()
 */
export function calculateBusFactor(commits: Commit[]): BusFactorResult {
  const { totalCommits, contributors } = computeCommitAnalytics(commits);

  if (totalCommits === 0) {
    return {
      busFactor: 0,
      riskLevel: "unknown",
      explanation: "No commit data available to calculate bus factor.",
      topContributors: [],
      cumulativePercentage: 0,
      totalCommits: 0,
    };
  }

  // Greedy selection — taking the largest contributors first is what
  // minimizes the count needed to reach the threshold. Any other order
  // would only reach 50% with an equal or greater number of people.
  let cumulativePercentage = 0;
  const topContributors: string[] = [];

  for (const contributor of contributors) {
    cumulativePercentage += contributor.percentage;
    topContributors.push(contributor.author);
    if (cumulativePercentage >= OWNERSHIP_THRESHOLD_PERCENT) {
      break;
    }
  }

  const busFactor = topContributors.length;
  const riskLevel = getRiskLevel(busFactor);
  const roundedCumulative = Math.round(cumulativePercentage * 10) / 10;

  const explanation =
    busFactor === 1
      ? `${topContributors[0]} alone accounts for ${roundedCumulative}% of ${totalCommits} commits — if they left, half the project's history walks out with them.`
      : `${busFactor} contributors (${topContributors.join(", ")}) together account for ${roundedCumulative}% of ${totalCommits} commits — that's the smallest group covering half the project's history.`;

  return {
    busFactor,
    riskLevel,
    explanation,
    topContributors,
    cumulativePercentage: roundedCumulative,
    totalCommits,
  };
}