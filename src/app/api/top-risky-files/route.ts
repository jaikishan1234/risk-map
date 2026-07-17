import { NextRequest, NextResponse } from "next/server";
import {
  analyzeRequestSchema,
  parseGitHubUrl,
} from "@/lib/validation/analyze-request.schema";
import { githubService, GitHubServiceError } from "@/services/github.service";
import { classifyFiles } from "@/lib/analytics/file-classification";
import { computeFileRiskScore } from "@/lib/analytics/file-risk";
import type { FileRiskEntry } from "@/types/analytics.types";

// Fetching a file's commit history is one extra GitHub API call per file.
// We bound the sample to keep this endpoint's rate-limit cost predictable
// regardless of repo size — a repo with 50,000 files still only costs
// MAX_FILES_ANALYZED extra requests, not one per file.
const MAX_FILES_ANALYZED = 15;
const TOP_RESULTS = 10;

interface TopRiskyFilesResponseBody {
  files: FileRiskEntry[];
}

interface ErrorResponseBody {
  error: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<TopRiskyFilesResponseBody | ErrorResponseBody>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const parsedUrl = parseGitHubUrl(parsed.data.repositoryUrl);
  if (!parsedUrl) {
    return NextResponse.json(
      { error: "Could not extract owner/repo from the provided URL." },
      { status: 400 }
    );
  }

  const { owner, repo } = parsedUrl;

  try {
    const tree = await githubService.getRepositoryTree(owner, repo);
    const { files: classifiedFiles } = classifyFiles(tree);
    const codeFilePaths = new Set(
      classifiedFiles
        .filter((file) => file.category === "code")
        .map((file) => file.path)
    );

    // Sample the largest code files as a proxy for "most significant" —
    // deterministic, no extra API calls needed to pick the sample, and
    // larger files are a reasonable (if imperfect) stand-in for
    // complexity/importance without doing real static analysis.
    const sampledFiles = tree
      .filter((entry) => entry.type === "file" && codeFilePaths.has(entry.path))
      .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
      .slice(0, MAX_FILES_ANALYZED);

    const fileRiskEntries = await Promise.all(
      sampledFiles.map(async (file) => {
        const commits = await githubService.getFileCommits(
          owner,
          repo,
          file.path
        );
        return computeFileRiskScore(file.path, commits);
      })
    );

    const topRiskyFiles = fileRiskEntries
      .filter((entry) => entry.lastModified !== null)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, TOP_RESULTS);

    return NextResponse.json({ files: topRiskyFiles }, { status: 200 });
  } catch (error) {
    if (error instanceof GitHubServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Unexpected error in POST /api/top-risky-files:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while ranking risky files." },
      { status: 500 }
    );
  }
}