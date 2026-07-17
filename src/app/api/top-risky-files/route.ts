import { NextRequest, NextResponse } from "next/server";
import {
  analyzeRequestSchema,
  parseGitHubUrl,
} from "@/lib/validation/analyze-request.schema";
import { GitHubServiceError } from "@/services/github.service";
import { buildTopRiskyFiles } from "@/lib/analytics/build-top-risky-files";
import type { FileRiskEntry } from "@/types/analytics.types";

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

  try {
    const files = await buildTopRiskyFiles(parsedUrl.owner, parsedUrl.repo);
    return NextResponse.json({ files }, { status: 200 });
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