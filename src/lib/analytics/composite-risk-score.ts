import type {
  CompositeRiskResult,
  RiskScoreInput,
} from "@/types/analytics.types";
import { getRiskLevelFromScore } from "@/utils/risk-level";

/**
 * Weights for each signal in the composite score. Sum to 1.0 so the
 * composite stays on the same 0-100 scale as its inputs.
 *
 * Rationale for the split: this app's stated goal (per AGENTS.md) is
 * identifying *knowledge concentration and bus-factor risk* specifically —
 * that's the primary thing being measured, not a side consideration. So
 * the two signals that directly capture ownership concentration (bus
 * factor and HHI-based concentration) are weighted 60% combined, while
 * recency and documentation are supporting/contextual signals — real risk
 * factors, but secondary to "how concentrated is ownership" — splitting
 * the remaining 40% evenly between them.
 *
 * These are named constants specifically so they're easy to tune later
 * without touching the combination logic itself.
 */
const WEIGHTS = {
  busFactor: 0.35,
  concentration: 0.25,
  recency: 0.2,
  documentation: 0.2,
} as const;

function clampTo100(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Converts a raw bus factor (a contributor *count*, e.g. from
 * calculateBusFactor().busFactor) into a 0-100 risk score comparable to
 * the other three inputs, which already come pre-scored on 0-100.
 *
 *   busFactorRisk = 100 / busFactor         (capped at 100)
 *
 * This is a simple inverse relationship: doubling the bus factor halves
 * the risk contribution. It's deliberately gentler than an exponential
 * curve here, because bus factor is already a fairly coarse, discrete
 * signal (1, 2, 3, ...) — we don't want small differences in team size to
 * swing the composite score as sharply as continuous signals like recency.
 *
 *   busFactor = 1  -> risk = 100   (single point of failure)
 *   busFactor = 2  -> risk =  50
 *   busFactor = 4  -> risk =  25
 *   busFactor = 10 -> risk =  10
 *
 * busFactor <= 0 means "no commit data" (see calculateBusFactor) — there's
 * no signal to convert, so this returns 0 rather than a misleading number.
 */
function busFactorToRiskScore(busFactor: number): number {
  if (busFactor <= 0) return 0;
  return clampTo100(100 / busFactor);
}

/**
 * Composite Risk Score — combines four independent risk signals into one
 * overall score (0-100, higher = riskier) and a risk tier, using a simple
 * weighted average:
 *
 *   overallRiskScore = Σ (weight_i × score_i)
 *
 * A weighted average (rather than, say, taking the max or multiplying
 * signals together) means no single signal can unilaterally dominate the
 * result — a repo with a great bus factor but zero documentation still
 * lands in a moderate-risk band rather than being fully "saved" by one
 * good signal, and vice versa.
 *
 * `busFactor` is treated specially: a *lack* of commit data (busFactor
 * <= 0, meaning the input had zero commits) makes the whole composite
 * score meaningless, so the result is reported as riskLevel "unknown"
 * with a score of 0, rather than silently computing a partial score from
 * only three of the four signals.
 */
export function calculateCompositeRiskScore(
  input: RiskScoreInput
): CompositeRiskResult {
  const hasCommitData = input.busFactor > 0;

  const busFactorRisk = busFactorToRiskScore(input.busFactor);
  const concentrationScore = clampTo100(input.concentrationScore);
  const recencyRisk = clampTo100(input.recencyRisk);
  const documentationRisk = clampTo100(input.documentationRisk);

  const breakdown = {
    busFactorRisk: roundToOneDecimal(busFactorRisk),
    concentrationScore: roundToOneDecimal(concentrationScore),
    recencyRisk: roundToOneDecimal(recencyRisk),
    documentationRisk: roundToOneDecimal(documentationRisk),
  };

  if (!hasCommitData) {
    return { overallRiskScore: 0, riskLevel: "unknown", breakdown };
  }

  const rawScore =
    WEIGHTS.busFactor * busFactorRisk +
    WEIGHTS.concentration * concentrationScore +
    WEIGHTS.recency * recencyRisk +
    WEIGHTS.documentation * documentationRisk;

  const overallRiskScore = roundToOneDecimal(clampTo100(rawScore));
  const riskLevel = getRiskLevelFromScore(overallRiskScore);

  return { overallRiskScore, riskLevel, breakdown };
}