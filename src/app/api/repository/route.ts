import { NextRequest, NextResponse } from "next/server";
import {
  analyzeRequestSchema,
  parseGitHubUrl,
} from "@/lib/validation/analyze-request.schema";
import { githubService, GitHubServiceError } from "@/services/github.service";
import type { RepositoryMetadata } from "@/types/repository.types";

interface RepositoryResponseBody {
  repository: RepositoryMetadata;
}

interface ErrorResponseBody {
  error: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<RepositoryResponseBody | ErrorResponseBody>> {
  // 1. Parse the request body — malformed/non-JSON body is a 400, not a 500.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  // 2. Validate shape + URL format with Zod.
  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  // 3. Extract owner/repo. Should always succeed post-schema-validation,
  //    but guard anyway rather than assume.
  const parsedUrl = parseGitHubUrl(parsed.data.repositoryUrl);
  if (!parsedUrl) {
    return NextResponse.json(
      { error: "Could not extract owner/repo from the provided URL." },
      { status: 400 }
    );
  }

  // 4. Fetch from GitHub, mapping known failure modes to proper status codes.
  try {
    const repository = await githubService.getRepository(
      parsedUrl.owner,
      parsedUrl.repo
    );
    return NextResponse.json({ repository }, { status: 200 });
  } catch (error) {
    if (error instanceof GitHubServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Unexpected error in POST /api/repository:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while analyzing the repository." },
      { status: 500 }
    );
  }
}