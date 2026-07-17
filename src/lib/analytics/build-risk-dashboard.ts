import { githubService } from "@/services/github.service";
import { computeCommitAnalytics } from "@/lib/analytics/commit-analytics";
import { calculateBusFactor } from "@/lib/analytics/bus-factor";
import { calculateConcentrationScore } from "@/lib/analytics/concentration-score";
import { calculateRecencyRisk } from "@/lib/analytics/recency-risk";
import { classifyFiles } from "@/lib/analytics/file-classification";
import { calculateDocumentationRisk } from "@/lib/analytics/documentation-risk";
import { calculateCompositeRiskScore } from "@/lib/analytics/composite-risk-score";
import type { RepositoryMetadata, RepositoryTreeEntry } from "@/types/repository.types";
import type { RiskDashboardData } from "@/types/analytics.types";

function hasReadmeFile(entries: RepositoryTreeEntry[]): boolean {
  return entries.some((entry) => {
    const filename = (entry.path.split("/").pop() ?? entry.path).toLowerCase();
    return /^readme(\.[a-z0-9]+)?$/.test(filename);
  });
}

/**
 * Fetches everything needed and runs the full deterministic scoring
 * pipeline for one repository. Shared by /api/risk-score (which returns
 * this directly) and /api/explain (which feeds this into the AI prompt) —
 * pulled out so both routes call one real implementation instead of two
 * copies that could quietly drift apart.
 *
 * GitHubService's internal caching means calling this a second time for a
 * repo already analyzed in the last 5 minutes costs no extra GitHub API
 * calls — only the first call per repo actually hits the network.
 */
export async function buildRiskDashboard(
  owner: string,
  repo: string
): Promise<{ repository: RepositoryMetadata; riskDashboard: RiskDashboardData }> {
  const [repository, commits, tree] = await Promise.all([
    githubService.getRepository(owner, repo),
    githubService.getCommits(owner, repo),
    githubService.getRepositoryTree(owner, repo),
  ]);

  const commitAnalytics = computeCommitAnalytics(commits);
  const busFactorResult = calculateBusFactor(commits);
  const concentrationScore = calculateConcentrationScore(commitAnalytics.contributors);
  const recencyRisk = calculateRecencyRisk(repository.lastUpdated);

  const classification = classifyFiles(tree);
  const hasReadme = hasReadmeFile(tree);
  const documentationRisk = calculateDocumentationRisk({
    docsCount: classification.stats.byCategory.documentation,
    codeFilesCount: classification.stats.byCategory.code,
    hasReadme,
  });

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

  return { repository, riskDashboard };
}