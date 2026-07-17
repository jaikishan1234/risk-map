import { NextRequest, NextResponse } from "next/server";
import {
  analyzeRequestSchema,
  parseGitHubUrl,
} from "@/lib/validation/analyze-request.schema";
import { GitHubServiceError } from "@/services/github.service";
import { buildRiskDashboard } from "@/lib/analytics/build-risk-dashboard";
import { buildTopRiskyFiles } from "@/lib/analytics/build-top-risky-files";
import { explainRiskAnalysis, GeminiServiceError } from "@/services/gemini.service";
import type { AIExplanationOutput } from "@/lib/validation/ai-explanation.schema";

interface ExplainResponseBody {
  insights: AIExplanationOutput;
}

interface ErrorResponseBody {
  error: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ExplainResponseBody | ErrorResponseBody>> {
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
    // Both of these hit GitHubService's internal cache if /api/risk-score
    // or /api/top-risky-files were already called for this repo in the
    // last 5 minutes — typically true, since the page fires all requests
    // together on Analyze.
    const [{ repository, riskDashboard }, topRiskyFiles] = await Promise.all([
      buildRiskDashboard(owner, repo),
      buildTopRiskyFiles(owner, repo),
    ]);

    const insights = await explainRiskAnalysis({
      repositoryName: repository.name,
      repositoryDescription: repository.description,
      riskDashboard,
      topRiskyFiles,
    });

    return NextResponse.json({ insights }, { status: 200 });
  } catch (error) {
    if (error instanceof GitHubServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof GeminiServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Unexpected error in POST /api/explain:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while generating AI insights." },
      { status: 500 }
    );
  }
}