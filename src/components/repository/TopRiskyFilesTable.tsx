"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FileRiskEntry } from "@/types/analytics.types";
import { getRiskLevelFromScore, RISK_LEVEL_COLOR } from "@/utils/risk-level";
import { formatRelativeDate } from "@/utils/format";

interface TopRiskyFilesTableProps {
  files: FileRiskEntry[];
}

type SortKey = "path" | "owner" | "riskScore" | "lastModified";
type SortDirection = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "path", label: "File" },
  { key: "owner", label: "Owner" },
  { key: "riskScore", label: "Risk Score" },
  { key: "lastModified", label: "Last Modified" },
];

function compareValues(
  a: FileRiskEntry,
  b: FileRiskEntry,
  key: SortKey
): number {
  if (key === "riskScore") return a.riskScore - b.riskScore;
  if (key === "lastModified") {
    return (
      new Date(a.lastModified ?? 0).getTime() -
      new Date(b.lastModified ?? 0).getTime()
    );
  }
  const aValue = (a[key] ?? "").toLowerCase();
  const bValue = (b[key] ?? "").toLowerCase();
  return aValue.localeCompare(bValue);
}

export function TopRiskyFilesTable({ files }: TopRiskyFilesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("riskScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedFiles = useMemo(() => {
    const sorted = [...files].sort((a, b) => compareValues(a, b, sortKey));
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [files, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Risk score and last-modified read more naturally starting from
      // "worst"/"most recent" first; file and owner read naturally A-Z.
      setSortDirection(key === "path" || key === "owner" ? "asc" : "desc");
    }
  };

  if (files.length === 0) {
    return (
      <p className="py-6 text-center font-mono text-xs text-muted-foreground">
        No file-level risk data available for this repository.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {COLUMNS.map((column) => (
              <TableHead key={column.key}>
                <button
                  type="button"
                  onClick={() => handleSort(column.key)}
                  className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                >
                  {column.label}
                  {sortKey === column.key ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3" aria-hidden="true" />
                    ) : (
                      <ArrowDown className="size-3" aria-hidden="true" />
                    )
                  ) : (
                    <ArrowUpDown
                      className="size-3 opacity-40"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedFiles.map((file) => {
            const riskColor = RISK_LEVEL_COLOR[getRiskLevelFromScore(file.riskScore)];
            return (
              <TableRow key={file.path}>
                <TableCell
                  className="max-w-[280px] truncate font-mono text-xs text-foreground"
                  title={file.path}
                >
                  {file.path}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {file.owner ?? "—"}
                </TableCell>
                <TableCell>
                  <span
                    className="rounded-full px-2 py-0.5 font-mono text-xs font-medium"
                    style={{
                      color: riskColor,
                      backgroundColor: `color-mix(in oklch, ${riskColor}, transparent 88%)`,
                    }}
                  >
                    {file.riskScore}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {file.lastModified ? formatRelativeDate(file.lastModified) : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}