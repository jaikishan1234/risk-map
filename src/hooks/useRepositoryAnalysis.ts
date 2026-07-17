"use client";

import { useCallback, useState } from "react";
import type { Contributor, RepositoryMetadata } from "@/types/repository.types";
import type {
  FileRiskEntry,
  RiskDashboardData,
} from "@/types/analytics.types";
import type { AIExplanationOutput } from "@/lib/validation/ai-explanation.schema";

export type CoreAnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      repository: RepositoryMetadata;
      contributors: Contributor[];
      riskDashboard: RiskDashboardData;
    }
  | { status: "error"; message: string };

export type AsyncSlice<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
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
interface TopRiskyFilesResponseBody {
  files?: FileRiskEntry[];
  error?: string;
}
interface ExplainResponseBody {
  insights?: AIExplanationOutput;
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

/**
 * Fires all five endpoints together on Analyze, but resolves into three
 * independent pieces of state instead of one combined one:
 *   - `core` (repository + contributors + risk score) — the fast path,
 *     three calls that mostly hit fresh GitHub data.
 *   - `topRiskyFiles` and `aiInsights` — slower (up to 15 extra GitHub
 *     calls, plus an LLM round-trip) and independent of each other and of
 *     `core`. Each renders as soon as it's ready rather than making the
 *     whole page wait on the slowest piece, and a failure in one (e.g. no
 *     GEMINI_API_KEY configured) doesn't block the other two from showing.
 */
export function useRepositoryAnalysis() {
  const [core, setCore] = useState<CoreAnalysisState>({ status: "idle" });
  const [topRiskyFiles, setTopRiskyFiles] = useState<AsyncSlice<FileRiskEntry[]>>({
    status: "idle",
  });
  const [aiInsights, setAiInsights] = useState<AsyncSlice<AIExplanationOutput>>({
    status: "idle",
  });

  const analyze = useCallback((repositoryUrl: string) => {
    setCore({ status: "loading" });
    setTopRiskyFiles({ status: "loading" });
    setAiInsights({ status: "loading" });

    // Core path — repository + contributors + risk score together.
    (async () => {
      try {
        const [repositoryResult, contributorsResult, riskScoreResult] =
          await Promise.all([
            postJson<RepositoryResponseBody>("/api/repository", repositoryUrl),
            postJson<ContributorsResponseBody>("/api/contributors", repositoryUrl),
            postJson<RiskScoreResponseBody>("/api/risk-score", repositoryUrl),
          ]);

        if (!repositoryResult.ok || !repositoryResult.body.repository) {
          setCore({
            status: "error",
            message:
              repositoryResult.body.error ??
              "Something went wrong. Please try again.",
          });
          return;
        }
        if (!contributorsResult.ok || !contributorsResult.body.contributors) {
          setCore({
            status: "error",
            message:
              contributorsResult.body.error ??
              "Fetched repository info, but couldn't load contributors.",
          });
          return;
        }
        if (!riskScoreResult.ok || !riskScoreResult.body.riskDashboard) {
          setCore({
            status: "error",
            message:
              riskScoreResult.body.error ??
              "Fetched repository info, but couldn't compute the risk score.",
          });
          return;
        }

        setCore({
          status: "success",
          repository: repositoryResult.body.repository,
          contributors: contributorsResult.body.contributors,
          riskDashboard: riskScoreResult.body.riskDashboard,
        });
      } catch {
        setCore({
          status: "error",
          message: "Network error — check your connection and try again.",
        });
      }
    })();

    // Top risky files — independent, doesn't wait for or block core.
    (async () => {
      try {
        const result = await postJson<TopRiskyFilesResponseBody>(
          "/api/top-risky-files",
          repositoryUrl
        );
        if (!result.ok || !result.body.files) {
          setTopRiskyFiles({
            status: "error",
            message: result.body.error ?? "Couldn't rank risky files.",
          });
          return;
        }
        setTopRiskyFiles({ status: "success", data: result.body.files });
      } catch {
        setTopRiskyFiles({
          status: "error",
          message: "Network error — check your connection and try again.",
        });
      }
    })();

    // AI insights — independent, doesn't wait for or block core or files.
    (async () => {
      try {
        const result = await postJson<ExplainResponseBody>(
          "/api/explain",
          repositoryUrl
        );
        if (!result.ok || !result.body.insights) {
          setAiInsights({
            status: "error",
            message: result.body.error ?? "Couldn't generate AI insights.",
          });
          return;
        }
        setAiInsights({ status: "success", data: result.body.insights });
      } catch {
        setAiInsights({
          status: "error",
          message: "Network error — check your connection and try again.",
        });
      }
    })();
  }, []);

  const reset = useCallback(() => {
    setCore({ status: "idle" });
    setTopRiskyFiles({ status: "idle" });
    setAiInsights({ status: "idle" });
  }, []);

  return { core, topRiskyFiles, aiInsights, analyze, reset };
}