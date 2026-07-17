"use client";

import { useCallback, useState } from "react";
import type { Contributor, RepositoryMetadata } from "@/types/repository.types";
import type { RiskDashboardData } from "@/types/analytics.types";

export type RepositoryAnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      repository: RepositoryMetadata;
      contributors: Contributor[];
      riskDashboard: RiskDashboardData;
    }
  | { status: "error"; message: string };

interface RepositoryResponseBody {
  repository?: RepositoryMetadata;
  error?: string;
}

interface ContributorsResponseBody {
  contributors?: Contributor[];
  error?: string;
}

interface RiskScoreResponseBody {
  riskDashboard?: RiskDashboardData;
  error?: string;
}

async function postJson<T>(url: string, repositoryUrl: string): Promise<{
  ok: boolean;
  body: T;
}> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repositoryUrl }),
  });
  const body: T = await response.json();
  return { ok: response.ok, body };
}

export function useRepositoryAnalysis() {
  const [state, setState] = useState<RepositoryAnalysisState>({
    status: "idle",
  });

  const analyze = useCallback(async (repositoryUrl: string) => {
    setState({ status: "loading" });

    try {
      // All three are independent GitHub-derived calls — fetch in parallel
      // rather than waiting on each one in sequence.
      const [repositoryResult, contributorsResult, riskScoreResult] =
        await Promise.all([
          postJson<RepositoryResponseBody>("/api/repository", repositoryUrl),
          postJson<ContributorsResponseBody>("/api/contributors", repositoryUrl),
          postJson<RiskScoreResponseBody>("/api/risk-score", repositoryUrl),
        ]);

      // Surface whichever call failed first — the repo lookup failing is
      // almost always the more fundamental problem, so check it first.
      if (!repositoryResult.ok || !repositoryResult.body.repository) {
        setState({
          status: "error",
          message:
            repositoryResult.body.error ??
            "Something went wrong. Please try again.",
        });
        return;
      }

      if (!contributorsResult.ok || !contributorsResult.body.contributors) {
        setState({
          status: "error",
          message:
            contributorsResult.body.error ??
            "Fetched repository info, but couldn't load contributors.",
        });
        return;
      }

      if (!riskScoreResult.ok || !riskScoreResult.body.riskDashboard) {
        setState({
          status: "error",
          message:
            riskScoreResult.body.error ??
            "Fetched repository info, but couldn't compute the risk score.",
        });
        return;
      }

      setState({
        status: "success",
        repository: repositoryResult.body.repository,
        contributors: contributorsResult.body.contributors,
        riskDashboard: riskScoreResult.body.riskDashboard,
      });
    } catch {
      setState({
        status: "error",
        message: "Network error — check your connection and try again.",
      });
    }
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, analyze, reset };
}