/**
 * Shared palette for per-contributor chart segments, so the same
 * contributor renders in a consistent color across different charts
 * (pie, stacked bar, etc.) within a single analysis.
 */
export const CONTRIBUTOR_CHART_COLORS = [
  "#6366f1", // indigo
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#a855f7", // purple
  "#ec4899", // pink
  "#84cc16", // lime
];

/** Color for the aggregated "everyone else" segment. */
export const OTHERS_CHART_COLOR = "#94a3b8"; // slate

export function getContributorColor(index: number): string {
  return CONTRIBUTOR_CHART_COLORS[index % CONTRIBUTOR_CHART_COLORS.length];
}