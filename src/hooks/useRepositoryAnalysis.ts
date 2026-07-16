"use client";

import { useCallback, useState } from "react";
import type { RepositoryMetadata } from "@/types/repository.types";

export type RepositoryAnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; repository: RepositoryMetadata }
  | { status: "error"; message: string };

interface RepositoryApiResponse {
  repository?: RepositoryMetadata;
  error?: string;
}

export function useRepositoryAnalysis() {
  const [state, setState] = useState<RepositoryAnalysisState>({
    status: "idle",
  });

  const analyze = useCallback(async (repositoryUrl: string) => {
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/repository", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryUrl }),
      });

      const body: RepositoryApiResponse = await response.json();

      if (!response.ok || !body.repository) {
        setState({
          status: "error",
          message: body.error ?? "Something went wrong. Please try again.",
        });
        return;
      }

      setState({ status: "success", repository: body.repository });
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