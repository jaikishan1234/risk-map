import { githubService } from "@/services/github.service";
import { classifyFiles } from "@/lib/analytics/file-classification";
import { computeFileRiskScore } from "@/lib/analytics/file-risk";
import type { FileRiskEntry } from "@/types/analytics.types";

// One extra GitHub API call per file analyzed — bounded so a repo of any
// size costs a predictable, small number of extra requests.
const MAX_FILES_ANALYZED = 15;
const TOP_RESULTS = 10;

/**
 * Samples the largest code files, fetches each one's commit history, and
 * scores them. Shared by /api/top-risky-files and /api/explain so both
 * routes run the identical sampling + scoring logic.
 */
export async function buildTopRiskyFiles(
  owner: string,
  repo: string
): Promise<FileRiskEntry[]> {
  const tree = await githubService.getRepositoryTree(owner, repo);
  const { files: classifiedFiles } = classifyFiles(tree.entries);
  const codeFilePaths = new Set(
    classifiedFiles
      .filter((file) => file.category === "code")
      .map((file) => file.path)
  );

  const sampledFiles = tree.entries
    .filter((entry) => entry.type === "file" && codeFilePaths.has(entry.path))
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
    .slice(0, MAX_FILES_ANALYZED);

  const fileRiskEntries = await Promise.all(
    sampledFiles.map(async (file) => {
      const commits = await githubService.getFileCommits(owner, repo, file.path);
      return computeFileRiskScore(file.path, commits);
    })
  );

  return fileRiskEntries
    .filter((entry) => entry.lastModified !== null)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, TOP_RESULTS);
}