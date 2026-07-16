"use client";

import { useState } from "react";
import { RepoUrlInput } from "./RepoUrlInput";
import { RepositoryResultCard } from "./RepositoryResultCard";
import type { RepositoryMetadata } from "@/types/repository.types";

type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; repository: RepositoryMetadata }
  | { status: "error"; message: string };

interface RepositoryApiResponse {
  repository?: RepositoryMetadata;
  error?: string;
}

export function AnalysisSection() {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });

  const handleAnalyze = async (repositoryUrl: string) => {
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
  };

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <RepoUrlInput
        onSubmit={handleAnalyze}
        isSubmitting={state.status === "loading"}
      />

      {state.status === "loading" && (
        <div
          role="status"
          aria-live="polite"
          className="flex w-full max-w-xl items-center gap-3 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm"
        >
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
          />
          Analyzing repository…
        </div>
      )}

      {state.status === "error" && (
        <div
          role="alert"
          className="w-full max-w-xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {state.message}
        </div>
      )}

      {state.status === "success" && (
        <RepositoryResultCard repository={state.repository} />
      )}
    </div>
  );
}