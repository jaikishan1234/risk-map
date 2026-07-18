"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react";

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
import { FileDetailsPanel } from "@/components/repository/FileDetailsPanel";

interface TopRiskyFilesTableProps {
  files: FileRiskEntry[];
  /** Needed so an expanded row can fetch that file's own details. */
  repositoryUrl: string;
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

export function TopRiskyFilesTable({ files, repositoryUrl }: TopRiskyFilesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("riskScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  const sortedFiles = useMemo(() => {
    const sorted = [...files].sort((a, b) => compareValues(a, b, sortKey));
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [files, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "path" || key === "owner" ? "asc" : "desc");
    }
  };

  const toggleExpanded = (path: string) => {
    setExpandedPath((current) => (current === path ? null : path));
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
            <TableHead className="w-6" />
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
            const isExpanded = expandedPath === file.path;
            const detailsId = `file-details-${slugifyPath(file.path)}`;
            return (
              <>
                <TableRow
                  key={file.path}
                  onClick={() => toggleExpanded(file.path)}
                  className="cursor-pointer"
                >
                  <TableCell className="w-6">
                    <button
                      type="button"
                      onClick={(event) => {
                        // Row already has an onClick that toggles too — stop
                        // propagation so this doesn't double-toggle back to
                        // closed when both fire.
                        event.stopPropagation();
                        toggleExpanded(file.path);
                      }}
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      aria-label={`${isExpanded ? "Collapse" : "Expand"} details for ${file.path}`}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ChevronRight
                        className={`size-3.5 transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </TableCell>
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
                {isExpanded && (
                  <TableRow
                    key={`${file.path}-details`}
                    id={detailsId}
                    className="hover:bg-transparent"
                  >
                    <TableCell colSpan={5} className="bg-muted/20 p-0">
                      <FileDetailsPanel repositoryUrl={repositoryUrl} path={file.path} />
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/** Turns a file path into a DOM-id-safe string for aria-controls linking. */
function slugifyPath(path: string): string {
  return path.replace(/[^a-zA-Z0-9_-]/g, "-");
}