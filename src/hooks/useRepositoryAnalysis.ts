"use client";

import { useCallback, useState } from "react";
import type { Contributor, RepositoryMetadata } from "@/types/repository.types";

export type RepositoryAnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      repository: RepositoryMetadata;
      contributors: Contributor[];
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

export function useRepositoryAnalysis() {
  const [state, setState] = useState<RepositoryAnalysisState>({
    status: "idle",
  });

  const analyze = useCallback(async (repositoryUrl: string) => {
    setState({ status: "loading" });

    try {
      // Fetch repository metadata and contributors in parallel — they're
      // independent GitHub API calls, no reason to wait on one for the other.
      const [repositoryResponse, contributorsResponse] = await Promise.all([
        fetch("/api/repository", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repositoryUrl }),
        }),
        fetch("/api/contributors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repositoryUrl }),
        }),
      ]);

      const repositoryBody: RepositoryResponseBody = await repositoryResponse.json();
      const contributorsBody: ContributorsResponseBody =
        await contributorsResponse.json();

      // Surface whichever call failed first. If the repo itself is
      // invalid/not found, that error is almost always the more useful one
      // to show, so check it first.
      if (!repositoryResponse.ok || !repositoryBody.repository) {
        setState({
          status: "error",
          message:
            repositoryBody.error ?? "Something went wrong. Please try again.",
        });
        return;
      }

      if (!contributorsResponse.ok || !contributorsBody.contributors) {
        setState({
          status: "error",
          message:
            contributorsBody.error ??
            "Fetched repository info, but couldn't load contributors.",
        });
        return;
      }

      setState({
        status: "success",
        repository: repositoryBody.repository,
        contributors: contributorsBody.contributors,
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