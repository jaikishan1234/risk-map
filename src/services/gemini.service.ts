import type { AIExplanationInput } from "@/types/analytics.types";
import {
  aiExplanationSchema,
  type AIExplanationOutput,
} from "@/lib/validation/ai-explanation.schema";
import {
  RISK_EXPLANATION_SYSTEM_INSTRUCTION,
  RISK_EXPLANATION_RESPONSE_SCHEMA,
  buildRiskExplanationPrompt,
} from "@/lib/ai/prompt-templates";

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export class GeminiServiceError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "GeminiServiceError";
  }
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
      parts: [{ text: RISK_EXPLANATION_SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: buildRiskExplanationPrompt(input) }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
      responseSchema: RISK_EXPLANATION_RESPONSE_SCHEMA,
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