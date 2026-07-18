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
  | { status: "error"; message: string; httpStatus?: number };

export type AsyncSlice<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string; httpStatus?: number };

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

async function postJson<T>(
  url: string,
  repositoryUrl: string
): Promise<{ ok: boolean; status: number; body: T }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repositoryUrl }),
  });
  const body: T = await response.json();
  return { ok: response.ok, status: response.status, body };
}

/**
 * Shared shape for `topRiskyFiles` and `aiInsights`: fetch one endpoint,
 * pull one named field out of the response, and set an AsyncSlice based
 * on whether that field came back. Both slices followed this exact
 * pattern independently before — pulled out once here since it's the
 * literal same steps, just a different URL/field/fallback message.
 */
async function loadAsyncSlice<T>(
  url: string,
  repositoryUrl: string,
  extractData: (body: Record<string, unknown>) => T | undefined,
  fallbackMessage: string,
  setSlice: (state: AsyncSlice<T>) => void
): Promise<void> {
  try {
    const result = await postJson<Record<string, unknown>>(url, repositoryUrl);
    const data = extractData(result.body);
    if (!result.ok || data === undefined) {
      const error = result.body.error;
      setSlice({
        status: "error",
        message: typeof error === "string" ? error : fallbackMessage,
        httpStatus: result.status,
      });
      return;
    }
    setSlice({ status: "success", data });
  } catch {
    setSlice({ status: "error", message: "Could not reach the server." });
  }
}

/**
 * Fires all five endpoints together on Analyze, but resolves into three
 * independent pieces of state instead of one combined one:
 *   - `core` (repository + contributors + risk score) — the fast path.
 *   - `topRiskyFiles` and `aiInsights` — slower and independent of each
 *     other and of `core`, so a failure in one doesn't block the others.
 *
 * Every error state carries `httpStatus` alongside the message, so the UI
 * can distinguish "repository not found" (404) from "rate limited"
 * (403/429) from "GitHub API had an outage" (500+) from "your network
 * dropped" (no status at all — the request never reached the server) and
 * show an appropriately different, user-friendly message for each. See
 * utils/error-messages.ts and components/ErrorMessageCard.tsx.
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
            httpStatus: repositoryResult.status,
          });
          return;
        }
        if (!contributorsResult.ok || !contributorsResult.body.contributors) {
          setCore({
            status: "error",
            message:
              contributorsResult.body.error ??
              "Fetched repository info, but couldn't load contributors.",
            httpStatus: contributorsResult.status,
          });
          return;
        }
        if (!riskScoreResult.ok || !riskScoreResult.body.riskDashboard) {
          setCore({
            status: "error",
            message:
              riskScoreResult.body.error ??
              "Fetched repository info, but couldn't compute the risk score.",
            httpStatus: riskScoreResult.status,
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
        // fetch() itself threw — the request never reached the server
        // (offline, DNS failure, etc.), so there's no httpStatus at all.
        setCore({
          status: "error",
          message: "Could not reach the server.",
        });
      }
    })();

    // Top risky files — independent, doesn't wait for or block core.
    void loadAsyncSlice<FileRiskEntry[]>(
      "/api/top-risky-files",
      repositoryUrl,
      (body) => body.files as FileRiskEntry[] | undefined,
      "Couldn't rank risky files.",
      setTopRiskyFiles
    );

    // AI insights — independent, doesn't wait for or block core or files.
    void loadAsyncSlice<AIExplanationOutput>(
      "/api/explain",
      repositoryUrl,
      (body) => body.insights as AIExplanationOutput | undefined,
      "Couldn't generate AI insights.",
      setAiInsights
    );
  }, []);

  const reset = useCallback(() => {
    setCore({ status: "idle" });
    setTopRiskyFiles({ status: "idle" });
    setAiInsights({ status: "idle" });
  }, []);

  return { core, topRiskyFiles, aiInsights, analyze, reset };
}