import { FlameKindling } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { FileRiskEntry } from "@/types/analytics.types";
import { getRiskLevelFromScore, RISK_LEVEL_COLOR, RISK_LEVEL_LABEL } from "@/utils/risk-level";
import { formatRelativeDate } from "@/utils/format";

interface FeaturedRiskyFileCardProps {
  /** The single highest-risk file — pass files[0] from an already
   *  risk-sorted list (Top Risky Files is sorted this way by default). */
  file: FileRiskEntry;
}

/**
 * A single, visually distinct card calling out the #1 highest-risk file,
 * shown above the full Top Risky Files table. The table already contains
 * this same file as its first row — this card doesn't add new data, it
 * adds emphasis: in a table of 10 rows, the most important one is easy to
 * scan past. This can't be.
 */
export function FeaturedRiskyFileCard({ file }: FeaturedRiskyFileCardProps) {
  const riskLevel = getRiskLevelFromScore(file.riskScore);
  const color = RISK_LEVEL_COLOR[riskLevel];

  return (
    <Card
      className="relative overflow-hidden border-border bg-card shadow-sm"
      style={{ borderColor: `color-mix(in oklch, ${color}, transparent 60%)` }}
    >
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <CardContent className="flex flex-col gap-3 p-5 pl-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in oklch, ${color}, transparent 88%)` }}
          >
            <FlameKindling className="size-4" style={{ color }} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Highest risk file
            </p>
            <p
              className="mt-0.5 max-w-[420px] truncate font-mono text-sm font-medium text-foreground"
              title={file.path}
            >
              {file.path}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Owned by{" "}
              <span className="font-medium text-foreground">
                {file.owner ?? "an unlinked contributor"}
              </span>
              {file.lastModified && (
                <> · last touched {formatRelativeDate(file.lastModified)}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 self-start sm:self-center">
          <span
            className="rounded-full px-2.5 py-1 font-mono text-xs font-medium"
            style={{
              color,
              backgroundColor: `color-mix(in oklch, ${color}, transparent 88%)`,
            }}
          >
            {RISK_LEVEL_LABEL[riskLevel]}
          </span>
          <p className="font-mono text-2xl font-semibold text-foreground">
            {file.riskScore}
            <span className="text-xs font-normal text-muted-foreground">/100</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}