import type { Commit } from "@/types/repository.types";
import type { FileRiskEntry } from "@/types/analytics.types";
import { analyzeOwnership } from "@/lib/analytics/ownership-analysis";
import { calculateConcentrationScore } from "@/lib/analytics/concentration-score";
import { calculateRecencyRisk } from "@/lib/analytics/recency-risk";

// How much weight ownership concentration vs. staleness get in a single
// file's risk score. Weighted toward concentration since "one person owns
// this file" is the more direct handoff-risk signal; recency is a
// meaningful but secondary modifier (a single-owner file that's under
// active development is somewhat less risky than one gone completely
// cold).
const CONCENTRATION_WEIGHT = 0.75;
const RECENCY_WEIGHT = 0.25;

/**
 * Computes a risk score for a single file from its own commit history.
 * Reuses the same ownership/concentration/recency calculators used for
 * repo-level scoring — "who owns this?" is the identical computation
 * whether the commit list represents an entire repo or one file, just at
 * a different scope.
 *
 * @param path    - file path, included in the returned entry for convenience
 * @param commits - this file's commit history, typically from
 *                  GitHubService.getFileCommits() (capped at 100 commits)
 */
export function computeFileRiskScore(
  path: string,
  commits: Commit[]
): FileRiskEntry {
  if (commits.length === 0) {
    return { path, owner: null, riskScore: 0, lastModified: null };
  }

  const ownership = analyzeOwnership(commits);
  const concentrationScore = calculateConcentrationScore(ownership.contributors);

  // Commits from getFileCommits() are newest-first, so the first entry is
  // the file's most recent modification date.
  const lastModified = commits[0].date;
  const recencyRisk = calculateRecencyRisk(lastModified);

  const rawScore =
    CONCENTRATION_WEIGHT * concentrationScore + RECENCY_WEIGHT * recencyRisk;
  const riskScore = Math.round(Math.min(100, Math.max(0, rawScore)) * 10) / 10;

  return {
    path,
    owner: ownership.primaryOwner,
    riskScore,
    lastModified,
  };
}