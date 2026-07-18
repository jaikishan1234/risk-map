"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Gauge, GitFork, Users, FileText, TriangleAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskDashboardData } from "@/types/analytics.types";
import { getContributorColor, OTHERS_CHART_COLOR } from "@/utils/chart-colors";
import { RiskScoreGauge } from "@/components/repository/RiskScoreGauge";
import { ContributorsDistributionChart } from "@/components/repository/ContributorsDistributionChart";

interface RiskDashboardProps {
  data: RiskDashboardData;
}

export function RiskDashboard({ data }: RiskDashboardProps) {
  const documentationScore = Math.round((100 - data.documentationRisk) * 10) / 10;

  const topContributors = data.contributors.slice(0, 6);
  const othersPercentage = data.contributors
    .slice(6)
    .reduce((sum, c) => sum + c.percentage, 0);

  const pieData = [
    ...topContributors.map((c) => ({ name: c.author, value: c.percentage })),
    ...(othersPercentage > 0
      ? [{ name: "Others", value: Math.round(othersPercentage * 10) / 10 }]
      : []),
  ];

  const breakdownData = [
    { label: "Bus Factor", value: data.breakdown.busFactorRisk },
    { label: "Concentration", value: data.breakdown.concentrationScore },
    { label: "Recency", value: data.breakdown.recencyRisk },
    { label: "Documentation", value: data.breakdown.documentationRisk },
  ];

  return (
    <div className="space-y-4">
      {data.fileTreeTruncated && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 font-mono text-xs text-amber-700 dark:text-amber-400">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            This repository&apos;s file tree is very large — GitHub returned a
            partial listing. Documentation and file-count stats below may
            undercount the true totals.
          </span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Gauge className="size-3.5" aria-hidden="true" />
              OVERALL RISK
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center pb-1">
            <RiskScoreGauge score={data.overallRiskScore} size={140} />
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Users className="size-3.5" aria-hidden="true" />
              BUS FACTOR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {data.busFactor}
            </p>
            <p className="mt-1 line-clamp-2 font-mono text-[11px] text-muted-foreground">
              {data.busFactorExplanation}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <GitFork className="size-3.5" aria-hidden="true" />
              CONTRIBUTORS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {data.contributors.length}
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              top owner: {data.contributors[0]?.percentage ?? 0}% of commits
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="size-3.5" aria-hidden="true" />
              DOCUMENTATION SCORE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {documentationScore}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              higher is healthier
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Commit Share by Contributor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <p className="font-mono text-xs text-muted-foreground">
                  No commit history to chart yet.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.name === "Others"
                              ? OTHERS_CHART_COLOR
                              : getContributorColor(index)
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value}%`, "commit share"]}
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
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Risk Score Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdownData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={90}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}/100`, "risk"]}
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
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  />
                  <Bar
                    dataKey="value"
                    fill="var(--primary)"
                    background={{ fill: "var(--muted)", radius: 4 }}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ownership concentration — complements the pie chart above with an
          explicit HHI score and a linear (easier to compare precisely than
          pie-slice angles) view of concentration. Full-width since it's a
          thin horizontal bar rather than a squarish chart. */}
      <ContributorsDistributionChart contributors={data.contributors} />
    </div>
  );
}