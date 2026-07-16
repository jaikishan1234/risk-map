export interface DocumentationRiskInput {
  /** Count of files classified as "documentation" (see file-classification.ts). */
  docsCount: number;
  /** Count of files classified as "code". */
  codeFilesCount: number;
  hasReadme: boolean;
}

// How quickly doc coverage risk falls off as the docs-to-code ratio grows.
// A ratio of RATIO_HALF_LIFE (10% as many doc files as code files) is
// treated as a reasonable middle ground for most codebases — not every
// file needs a matching doc, so coverage "risk" should already be more
// than half-resolved by that point, with diminishing returns after.
const RATIO_HALF_LIFE = 0.1;

// How much weight the doc-to-code ratio vs. README presence each get in
// the final score. README existence is weighted meaningfully on its own
// because it's the single most load-bearing doc in most repos — a missing
// README is a real risk signal even if per-file docs elsewhere are decent.
const RATIO_WEIGHT = 0.7;
const README_WEIGHT = 0.3;

/**
 * Documentation Risk Score — higher means worse documentation coverage
 * (consistent with this app's other risk scores, where higher = riskier).
 *
 * ─── Component 1: doc-to-code ratio ─────────────────────────────────────
 *
 * ratio = docsCount / codeFilesCount
 *
 * We convert this ratio into a "coverage" value using the same exponential
 * saturation shape used in recency-risk.ts, so coverage rises quickly at
 * first and then levels off — going from 0 docs to a few docs matters a
 * lot, but going from "well documented" to "extremely documented" doesn't
 * reduce risk much further:
 *
 *   coverage(ratio) = 100 × (1 − e^(−ratio / RATIO_HALF_LIFE))
 *   ratioRisk        = 100 − coverage(ratio)
 *
 * Example values (RATIO_HALF_LIFE = 0.1):
 *   ratio = 0.00  -> ratioRisk = 100.0  (no docs at all relative to code)
 *   ratio = 0.05  -> ratioRisk =  60.7
 *   ratio = 0.10  -> ratioRisk =  36.8
 *   ratio = 0.20  -> ratioRisk =  13.5
 *   ratio = 0.50  -> ratioRisk =   0.7
 *
 * If there are no code files at all, there's nothing to document, so this
 * component contributes zero risk regardless of docsCount.
 *
 * ─── Component 2: README presence ───────────────────────────────────────
 *
 * A flat binary signal: 0 risk if a README exists, 100 if it doesn't.
 * Kept separate from the ratio above (rather than just counting README as
 * one more doc file) because a missing README is a qualitatively different
 * problem — it's usually the first thing anyone new to the repo looks
 * for — so it deserves its own explicit weight rather than being diluted
 * into a single doc-file count.
 *
 * ─── Combining them ──────────────────────────────────────────────────────
 *
 * finalScore = RATIO_WEIGHT × ratioRisk + README_WEIGHT × readmeRisk
 *
 * A weighted average (rather than, say, multiplying the two) so that
 * neither component alone can single-handedly zero out or max out the
 * score — good per-file docs with no README still reads as meaningfully
 * risky, and a README alone doesn't fully offset poor per-file coverage.
 */
export function calculateDocumentationRisk({
  docsCount,
  codeFilesCount,
  hasReadme,
}: DocumentationRiskInput): number {
  const safeDocsCount = Math.max(0, docsCount);
  const safeCodeFilesCount = Math.max(0, codeFilesCount);

  // No code files means nothing to document — this component contributes
  // no risk rather than dividing by zero or guessing.
  const ratioRisk =
    safeCodeFilesCount === 0
      ? 0
      : 100 *
        (1 -
          Math.exp(-(safeDocsCount / safeCodeFilesCount) / RATIO_HALF_LIFE));

  const readmeRisk = hasReadme ? 0 : 100;

  const score = RATIO_WEIGHT * ratioRisk + README_WEIGHT * readmeRisk;

  // Defensive clamp against floating-point drift at the boundaries.
  const clamped = Math.min(100, Math.max(0, score));
  return Math.round(clamped * 10) / 10;
}