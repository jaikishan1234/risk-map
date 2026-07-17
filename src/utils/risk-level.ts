import type { RiskLevel } from "@/types/analytics.types";

/**
 * Single source of truth for score -> tier thresholds, shared by the
 * composite risk scorer and any UI component (like RiskScoreGauge) that
 * needs to color/label a 0-100 score consistently.
 */
const RISK_LEVEL_THRESHOLDS: { minScore: number; level: RiskLevel }[] = [
  { minScore: 75, level: "critical" },
  { minScore: 55, level: "high" },
  { minScore: 35, level: "medium" },
  { minScore: 0, level: "low" },
];

export function getRiskLevelFromScore(score: number): RiskLevel {
  const match = RISK_LEVEL_THRESHOLDS.find((tier) => score >= tier.minScore);
  return match?.level ?? "low";
}

/** Shared color per risk tier, reused by any component rendering a score. */
export const RISK_LEVEL_COLOR: Record<RiskLevel, string> = {
  critical: "var(--destructive)",
  high: "#f59e0b", // amber-500
  medium: "#eab308", // yellow-500
  low: "#10b981", // emerald-500
  unknown: "var(--muted-foreground)",
};

/** Shared human-readable label per risk tier. */
export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  critical: "Critical Risk",
  high: "High Risk",
  medium: "Medium Risk",
  low: "Low Risk",
  unknown: "Unknown",
};