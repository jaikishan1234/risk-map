import type { FileRiskEntry, RiskDashboardData } from "@/types/analytics.types";
import {
  aiExplanationSchema,
  type AIExplanationOutput,
} from "@/lib/validation/ai-explanation.schema";

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export class GeminiServiceError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "GeminiServiceError";
  }
}

export interface AIExplanationInput {
  repositoryName: string;
  repositoryDescription: string | null;
  riskDashboard: RiskDashboardData;
  /** Optional — include when the Top Risky Files table has already been computed. */
  topRiskyFiles?: FileRiskEntry[];
}

/**
 * Strict system instruction: this is the single most important part of
 * this file. The AI's role is explanation, never calculation — see
 * AGENTS.md: "AI should explain computed results. AI should not invent
 * risk scores. All AI explanations must be grounded in repository
 * analysis data."
 */
const SYSTEM_INSTRUCTION = `You are explaining a software repository's risk analysis to an engineering audience.

All scores, percentages, and statistics in this task have ALREADY been computed by a separate deterministic system, using fixed formulas (bus factor, Herfindahl-Hirschman ownership concentration, exponential recency decay, and a weighted documentation score). You are not shown those formulas and must not try to reproduce, recompute, re-derive, or sanity-check them.

Rules you must follow:
1. Never calculate, estimate, guess, or invent any numeric score, percentage, count, or statistic. Every number you mention must be copied verbatim from the DATA block you're given — same digits, same units.
2. If you want to reference a number that is not present in DATA, do not mention a number at all — describe it qualitatively instead (e.g. "a small handful of contributors" rather than making up a count).
3. Do not contradict the risk level already assigned in DATA (e.g. do not call a "critical" repo "fairly healthy").
4. Ground every claim in the specific data provided — contributor usernames, file paths, and numbers should come from DATA, not be invented or assumed.
5. Write plainly for engineers who will act on this — no marketing language, no hedging filler, no apologizing for the analysis.

Respond only with the requested JSON structure.`;

function buildPrompt(input: AIExplanationInput): string {
  const { repositoryName, repositoryDescription, riskDashboard, topRiskyFiles } =
    input;

  const data = {
    repository: {
      name: repositoryName,
      description: repositoryDescription,
    },
    overallRiskScore: riskDashboard.overallRiskScore,
    riskLevel: riskDashboard.riskLevel,
    busFactor: riskDashboard.busFactor,
    busFactorExplanation: riskDashboard.busFactorExplanation,
    documentationRisk: riskDashboard.documentationRisk,
    totalCommits: riskDashboard.totalCommits,
    topContributors: riskDashboard.contributors.slice(0, 10),
    fileClassification: riskDashboard.fileClassification,
    riskBreakdown: riskDashboard.breakdown,
    topRiskyFiles: topRiskyFiles?.slice(0, 10) ?? undefined,
  };

  return `DATA (the only source of numbers you may use):
${JSON.stringify(data, null, 2)}

Task: produce three things from this DATA, and nothing else:
- repositorySummary: 2-3 sentences summarizing this repository's overall knowledge-concentration risk posture.
- topRisks: 3-5 short bullet points, each naming a specific, concrete risk grounded in DATA (name real contributors/files/numbers from DATA where relevant).
- recommendations: 3-5 short, actionable bullet points an engineering team could act on this week to reduce the risks you identified.`;
}

/**
 * Calls the Gemini API to turn precomputed, deterministic risk data into a
 * plain-English summary, risk list, and recommendations. The AI never
 * computes anything — see SYSTEM_INSTRUCTION and aiExplanationSchema for
 * how that constraint is enforced both in the prompt and in the response
 * shape.
 */
export async function explainRiskAnalysis(
  input: AIExplanationInput
): Promise<AIExplanationOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiServiceError(
      "GEMINI_API_KEY is not configured on the server.",
      500
    );
  }

  const requestBody = {
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: buildPrompt(input) }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          repositorySummary: { type: "STRING" },
          topRisks: { type: "ARRAY", items: { type: "STRING" } },
          recommendations: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["repositorySummary", "topRisks", "recommendations"],
      },
    },
  };

  let response: Response;
  try {
    response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });
  } catch {
    throw new GeminiServiceError(
      "Could not reach the Gemini API. Check your network connection.",
      503
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new GeminiServiceError(
        "Gemini API rate limit exceeded. Try again shortly.",
        429
      );
    }
    throw new GeminiServiceError(
      `Gemini API request failed with status ${response.status}.`,
      response.status
    );
  }

  const payload = await response.json();
  const rawText: string | undefined =
    payload?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new GeminiServiceError(
      "Gemini API returned an empty or unexpected response.",
      502
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new GeminiServiceError(
      "Gemini API response was not valid JSON.",
      502
    );
  }

  // Validate before trusting anything — if the model drifted from the
  // requested shape, fail loudly rather than pass malformed data upstream.
  const result = aiExplanationSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new GeminiServiceError(
      "Gemini API response did not match the expected structure.",
      502
    );
  }

  return result.data;
}