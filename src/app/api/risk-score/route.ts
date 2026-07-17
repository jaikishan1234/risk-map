import { NextRequest, NextResponse } from "next/server";
import {
  analyzeRequestSchema,
  parseGitHubUrl,
} from "@/lib/validation/analyze-request.schema";
import { githubService, GitHubServiceError } from "@/services/github.service";
import { computeCommitAnalytics } from "@/lib/analytics/commit-analytics";
import { calculateBusFactor } from "@/lib/analytics/bus-factor";
import { calculateConcentrationScore } from "@/lib/analytics/concentration-score";
import { calculateRecencyRisk } from "@/lib/analytics/recency-risk";
import { classifyFiles } from "@/lib/analytics/file-classification";
import { calculateDocumentationRisk } from "@/lib/analytics/documentation-risk";
import { calculateCompositeRiskScore } from "@/lib/analytics/composite-risk-score";
import type { RiskDashboardData } from "@/types/analytics.types";

interface RiskScoreResponseBody {
  riskDashboard: RiskDashboardData;
}

interface ErrorResponseBody {
  error: string;
}

function hasReadmeFile(paths: string[]): boolean {
  return paths.some((path) => {
    const filename = (path.split("/").pop() ?? path).toLowerCase();
    return /^readme(\.[a-z0-9]+)?$/.test(filename);
  });
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

  const { owner, repo } = parsedUrl;

  try {
    const [repository, commits, tree] = await Promise.all([
      githubService.getRepository(owner, repo),
      githubService.getCommits(owner, repo),
      githubService.getRepositoryTree(owner, repo),
    ]);

    // ── Ground-truth commit stats ──────────────────────────────────────
    const commitAnalytics = computeCommitAnalytics(commits);
    const busFactorResult = calculateBusFactor(commits);
    const concentrationScore = calculateConcentrationScore(
      commitAnalytics.contributors
    );
    const recencyRisk = calculateRecencyRisk(repository.lastUpdated);

    // ── File-tree derived stats ────────────────────────────────────────
    const classification = classifyFiles(tree);
    const hasReadme = hasReadmeFile(tree.map((entry) => entry.path));
    const documentationRisk = calculateDocumentationRisk({
      docsCount: classification.stats.byCategory.documentation,
      codeFilesCount: classification.stats.byCategory.code,
      hasReadme,
    });

    // ── Combine into one composite score ───────────────────────────────
    const composite = calculateCompositeRiskScore({
      busFactor: busFactorResult.busFactor,
      concentrationScore,
      recencyRisk,
      documentationRisk,
    });

    const riskDashboard: RiskDashboardData = {
      overallRiskScore: composite.overallRiskScore,
      riskLevel: composite.riskLevel,
      busFactor: busFactorResult.busFactor,
      busFactorExplanation: busFactorResult.explanation,
      documentationRisk,
      totalCommits: commitAnalytics.totalCommits,
      contributors: commitAnalytics.contributors,
      fileClassification: classification.stats,
      breakdown: composite.breakdown,
    };

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