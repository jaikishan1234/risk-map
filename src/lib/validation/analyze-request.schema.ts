import { z } from "zod";

/**
 * Matches public GitHub repository URLs, e.g.:
 *   https://github.com/facebook/react
 *   https://github.com/vercel/next.js
 *   https://github.com/vercel/next.js/   (trailing slash ok)
 *   https://github.com/vercel/next.js.git (".git" suffix ok)
 *
 * Deliberately rejects:
 *   - non-github.com hosts (gitlab.com, bitbucket.org, etc.)
 *   - http:// (not https://)
 *   - URLs with extra path segments (issues, pulls, tree/branch, etc.)
 *   - missing owner or repo segment
 */
const GITHUB_REPO_URL_PATTERN =
  /^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/;

export const analyzeRequestSchema = z.object({
  repositoryUrl: z
    .string()
    .trim()
    .min(1, "Enter a GitHub repository URL.")
    .refine((url) => GITHUB_REPO_URL_PATTERN.test(url), {
      message:
        "Enter a valid public GitHub repository URL, e.g. https://github.com/facebook/react",
    }),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

/**
 * Extracts { owner, repo } from an already-validated GitHub URL.
 * Only call this after analyzeRequestSchema has confirmed the URL is valid.
 */
export function parseGitHubUrl(
  repositoryUrl: string
): { owner: string; repo: string } | null {
  const match = repositoryUrl.trim().match(GITHUB_REPO_URL_PATTERN);
  if (!match) return null;
  const [, owner, repo] = match;
  return { owner, repo: repo.replace(/\.git$/, "") };
}