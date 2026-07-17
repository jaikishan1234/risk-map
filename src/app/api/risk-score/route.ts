import { NextRequest, NextResponse } from "next/server";
import {
  analyzeRequestSchema,
  parseGitHubUrl,
} from "@/lib/validation/analyze-request.schema";
import { GitHubServiceError } from "@/services/github.service";
import { buildRiskDashboard } from "@/lib/analytics/build-risk-dashboard";
import type { RiskDashboardData } from "@/types/analytics.types";

interface RiskScoreResponseBody {
  riskDashboard: RiskDashboardData;
}

interface ErrorResponseBody {
  error: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<RiskScoreResponseBody | ErrorResponseBody>> {
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
    const { riskDashboard } = await buildRiskDashboard(
      parsedUrl.owner,
      parsedUrl.repo
    );
    return NextResponse.json({ riskDashboard }, { status: 200 });
  } catch (error) {
    if (error instanceof GitHubServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Unexpected error in POST /api/risk-score:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while computing the risk score." },
      { status: 500 }
    );
  }
}