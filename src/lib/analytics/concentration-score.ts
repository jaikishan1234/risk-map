import type { ContributorCommitStats } from "@/types/analytics.types";

/**
 * Contributor Concentration Score — built on the Herfindahl-Hirschman Index
 * (HHI), a standard measure economists use for market concentration (e.g.
 * "how monopolistic is this industry?"). Applied here to commits instead of
 * market share: "how concentrated is ownership of this commit history?"
 *
 * ─── The math ───────────────────────────────────────────────────────────
 *
 * Classic HHI definition: sum the square of each participant's share of
 * the whole, where share is expressed as a fraction from 0 to 1.
 *
 *   HHI = Σ (share_i)²        for i = 1..n contributors
 *
 * Squaring is the key trick: it punishes concentration much harder than
 * plain averaging would. A contributor with 50% share contributes 0.25 to
 * the sum; a contributor with 10% share contributes only 0.01 — five times
 * the share yields twenty-five times the contribution to HHI. That's what
 * makes HHI sensitive to *dominance*, not just to "who has the most."
 *
 * Two illustrative extremes:
 *   - One contributor owns 100% of commits:
 *       HHI = (1.0)² = 1.0                          (maximum concentration)
 *   - Commits are split perfectly evenly across n contributors:
 *       HHI = n × (1/n)² = 1/n                       (approaches 0 as n grows)
 *
 * So raw HHI always falls in the range (1/n, 1], with 1.0 meaning total
 * concentration (bus factor of 1) and values near 0 meaning commits are
 * spread thinly across many people.
 *
 * ─── Rescaling to our 0–100 score ───────────────────────────────────────
 *
 * Our inputs arrive as *percentages* (0–100) rather than fractions (0–1),
 * since that's what ContributorCommitStats.percentage already holds. To
 * compute HHI correctly we first convert each percentage back to a
 * fraction (divide by 100), square it, and sum — that's the real HHI, in
 * its natural [0, 1] range. We then multiply by 100 purely to present it
 * on a friendlier 0–100 scale (matching this app's other scores), which is
 * equivalent to: score = Σ (percentage_i)² / 100.
 */
export function calculateConcentrationScore(
  contributors: ContributorCommitStats[]
): number {
  // No data to concentrate — nothing to score.
  if (contributors.length === 0) {
    return 0;
  }

  // Step 1: convert each contributor's percentage share (0-100) into a
  // fraction (0-1), square it, and sum across all contributors. This sum
  // is the textbook HHI value, naturally bounded to (0, 1].
  const hhi = contributors.reduce((sum, contributor) => {
    const shareAsFraction = contributor.percentage / 100;
    return sum + shareAsFraction * shareAsFraction;
  }, 0);

  // Step 2: rescale HHI's [0, 1] range onto our documented [0, 100] score
  // range. A single dominant contributor (HHI = 1.0) becomes a score of
  // 100; commits spread evenly across many contributors (HHI near 0)
  // becomes a score near 0.
  const rawScore = hhi * 100;

  // Step 3: defensive clamp + round. Floating-point arithmetic and
  // upstream percentages that don't sum to *exactly* 100 (due to earlier
  // rounding to 1 decimal place) could otherwise push the result a hair
  // outside [0, 100] — the function's contract should hold regardless.
  const clampedScore = Math.min(100, Math.max(0, rawScore));
  return Math.round(clampedScore * 10) / 10;
}