"use client";

import { useEffect, useState } from "react";
import { GitCommitHorizontal } from "lucide-react";

import type { FileDetails } from "@/types/analytics.types";
import { ErrorMessageCard } from "@/components/ErrorMessageCard";
import { getContributorColor } from "@/utils/chart-colors";
import { formatRelativeDate } from "@/utils/format";

interface FileDetailsPanelProps {
  repositoryUrl: string;
  path: string;
}

type PanelState =
  | { status: "loading" }
  | { status: "success"; data: FileDetails }
  | { status: "error"; message: string; httpStatus?: number };

export function FileDetailsPanel({ repositoryUrl, path }: FileDetailsPanelProps) {
  const [state, setState] = useState<PanelState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState({ status: "loading" });
      try {
        const response = await fetch("/api/file-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repositoryUrl, path }),
        });
        const body = await response.json();
        if (cancelled) return;

        if (!response.ok || !body.fileDetails) {
          setState({
            status: "error",
            message: body.error ?? "Couldn't load file details.",
            httpStatus: response.status,
          });
          return;
        }
        setState({ status: "success", data: body.fileDetails });
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Could not reach the server." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [repositoryUrl, path]);

  if (state.status === "loading") {
    return (
      <div className="space-y-3 p-4">
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="p-2">
        <ErrorMessageCard
          message={state.message}
          httpStatus={state.httpStatus}
          compact
        />
      </div>
    );
  }

  const { data } = state;

  return (
    <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2">
      {/* Ownership breakdown for this one file */}
      <div>
        <h5 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Ownership ({data.totalCommits} commit{data.totalCommits === 1 ? "" : "s"})
        </h5>
        {data.contributors.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">
            No commit history found for this file.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {data.contributors.slice(0, 6).map((contributor, index) => (
              <li key={contributor.author} className="flex items-center gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: getContributorColor(index) }}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate font-mono text-xs text-foreground">
                  {contributor.author}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {contributor.percentage}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent commit timeline */}
      <div>
        <h5 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Recent Commits
        </h5>
        {data.recentCommits.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">
            No commits found for this file.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {data.recentCommits.map((commit) => (
              <li
                key={commit.sha}
                className="flex items-center gap-2 font-mono text-xs text-muted-foreground"
              >
                <GitCommitHorizontal
                  className="size-3 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-foreground">{commit.sha}</span>
                <span className="truncate">{commit.author}</span>
                <span className="ml-auto shrink-0">
                  {formatRelativeDate(commit.date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}