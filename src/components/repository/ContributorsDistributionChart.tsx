"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContributorCommitStats } from "@/types/analytics.types";
import { calculateConcentrationScore } from "@/lib/analytics/concentration-score";
import {
  getRiskLevelFromScore,
  RISK_LEVEL_COLOR,
  RISK_LEVEL_LABEL,
} from "@/utils/risk-level";
import { getContributorColor, OTHERS_CHART_COLOR } from "@/utils/chart-colors";

interface ContributorsDistributionChartProps {
  contributors: ContributorCommitStats[];
  /** How many individual contributors to show before grouping the rest into "Others". */
  maxSegments?: number;
}

/**
 * Visualizes ownership concentration as a single 100%-stacked horizontal
 * bar — one segment per contributor, sized to their share of commits. A
 * long, dominant first segment reads instantly as "concentrated"; many
 * similarly-sized segments reads as "distributed" — the same intuition as
 * a cap table or market-share chart, applied to commit ownership.
 *
 * Paired with the same HHI-based concentration score used everywhere else
 * in the app (calculateConcentrationScore), so the chart and the number
 * always agree.
 */
export function ContributorsDistributionChart({
  contributors,
  maxSegments = 6,
}: ContributorsDistributionChartProps) {
  if (contributors.length === 0) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-sm font-medium">
            Ownership Concentration
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <p className="py-6 text-center font-mono text-xs text-muted-foreground">
            No contributor data available for this repository.
          </p>
        </CardContent>
      </Card>
    );
  }

  const concentrationScore = calculateConcentrationScore(contributors);
  const riskLevel = getRiskLevelFromScore(concentrationScore);
  const scoreColor = RISK_LEVEL_COLOR[riskLevel];

  const shown = contributors.slice(0, maxSegments);
  const others = contributors.slice(maxSegments);
  const othersPercentage =
    Math.round(others.reduce((sum, c) => sum + c.percentage, 0) * 10) / 10;

  // Single-row stacked bar: one data point, one Bar per contributor
  // segment, all sharing the same stackId so they render side-by-side
  // within one horizontal bar.
  const chartData = [
    Object.fromEntries([
      ["name", "ownership"],
      ...shown.map((c) => [c.author, c.percentage]),
      ...(othersPercentage > 0 ? [["Others", othersPercentage]] : []),
    ]),
  ];

  const legendEntries = [
    ...shown.map((c, index) => ({
      label: c.author,
      percentage: c.percentage,
      color: getContributorColor(index),
    })),
    ...(othersPercentage > 0
      ? [{ label: "Others", percentage: othersPercentage, color: OTHERS_CHART_COLOR }]
      : []),
  ];

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border pb-4">
        <CardTitle className="text-sm font-medium">
          Ownership Concentration
        </CardTitle>
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[10px] font-medium"
          style={{
            color: scoreColor,
            backgroundColor: `color-mix(in oklch, ${scoreColor}, transparent 88%)`,
          }}
        >
          HHI SCORE {concentrationScore} · {RISK_LEVEL_LABEL[riskLevel].toUpperCase()}
        </span>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        <div className="h-12 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                formatter={(value: number, name: string) => [`${value}%`, name]}
                contentStyle={{
                  fontSize: 12,
                  fontFamily: "var(--font-mono, monospace)",
                  borderRadius: 8,
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  border: "1px solid var(--border)",
                }}
                itemStyle={{ color: "var(--popover-foreground)" }}
                labelStyle={{ color: "var(--popover-foreground)" }}
              />
              {shown.map((c, index) => (
                <Bar
                  key={c.author}
                  dataKey={c.author}
                  stackId="ownership"
                  fill={getContributorColor(index)}
                  radius={
                    index === 0
                      ? [4, 0, 0, 4]
                      : index === shown.length - 1 && othersPercentage === 0
                        ? [0, 4, 4, 0]
                        : [0, 0, 0, 0]
                  }
                />
              ))}
              {othersPercentage > 0 && (
                <Bar
                  dataKey="Others"
                  stackId="ownership"
                  fill={OTHERS_CHART_COLOR}
                  radius={[0, 4, 4, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {legendEntries.map((entry) => (
            <li
              key={entry.label}
              className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              {entry.label}
              <span className="text-foreground">{entry.percentage}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}