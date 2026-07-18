import { NextRequest, NextResponse } from "next/server";
import { parseGitHubUrl } from "@/lib/validation/analyze-request.schema";
import { fileDetailsRequestSchema } from "@/lib/validation/file-details-request.schema";
import { githubService, GitHubServiceError } from "@/services/github.service";
import { computeCommitAnalytics } from "@/lib/analytics/commit-analytics";
import { computeFileRiskScore } from "@/lib/analytics/file-risk";
import type { FileDetails } from "@/types/analytics.types";

const MAX_RECENT_COMMITS_SHOWN = 10;

interface FileDetailsResponseBody {
  fileDetails: FileDetails;
}

interface ErrorResponseBody {
  error: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<FileDetailsResponseBody | ErrorResponseBody>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = fileDetailsRequestSchema.safeParse(body);
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
  const { path } = parsed.data;

  try {
    // Same cache as everywhere else — if this file was already fetched
    // while building the Top Risky Files table, this costs zero extra
    // GitHub API calls.
    const commits = await githubService.getFileCommits(owner, repo, path);
    const { path: scoredPath, owner: fileOwner, riskScore, lastModified } =
      computeFileRiskScore(path, commits);
    const { totalCommits, contributors } = computeCommitAnalytics(commits);

    const fileDetails: FileDetails = {
      path: scoredPath,
      owner: fileOwner,
      riskScore,
      lastModified,
      totalCommits,
      contributors,
      recentCommits: commits
        .slice(0, MAX_RECENT_COMMITS_SHOWN)
        .map((commit) => ({
          sha: commit.sha.slice(0, 7),
          author: commit.author,
          date: commit.date,
        })),
    };

    return NextResponse.json({ fileDetails }, { status: 200 });
  } catch (error) {
    if (error instanceof GitHubServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Unexpected error in POST /api/file-details:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while loading file details." },
      { status: 500 }
    );
  }
}