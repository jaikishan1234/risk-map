import type { AIExplanationInput } from "@/types/analytics.types";

/**
 * System instruction: sets the audience, the ground rules, and the
 * non-negotiable constraint that the model must explain — never compute —
 * risk numbers. See AGENTS.md: "AI should explain computed results. AI
 * should not invent risk scores. All AI explanations must be grounded in
 * repository analysis data."
 *
 * Audience framing matters here: an engineering manager reading this
 * cares less about code-level detail and more about team/process
 * questions — "am I exposed if someone leaves," "where should I invest
 * review or pairing time," "is this a hiring/backup-planning problem."
 * The instructions below steer the model's tone and recommendation style
 * toward that audience specifically, rather than writing for the
 * individual contributor who'd read a code review comment.
 */
export const RISK_EXPLANATION_SYSTEM_INSTRUCTION = `You are explaining a software repository's knowledge-concentration risk analysis to an engineering manager — not to the individual contributors, and not as a code review. The reader cares about team-level exposure and what to do about it: staffing risk, succession planning, where to invest review/pairing/documentation effort, and whether this needs to be raised with leadership.

All scores, percentages, and statistics in this task have ALREADY been computed by a separate deterministic system, using fixed formulas (bus factor, Herfindahl-Hirschman ownership concentration, exponential recency decay, and a weighted documentation score). You are not shown those formulas and must not try to reproduce, recompute, re-derive, or sanity-check them.

Rules you must follow:
1. Never calculate, estimate, guess, or invent any numeric score, percentage, count, or statistic. Every number you mention must be copied verbatim from the DATA block you're given — same digits, same units.
2. If you want to reference a number that is not present in DATA, do not mention a number at all — describe it qualitatively instead (e.g. "a small handful of contributors" rather than making up a count).
3. Do not contradict the risk level already assigned in DATA (e.g. do not call a "critical" repo "fairly healthy").
4. Ground every claim in the specific data provided — contributor usernames, file paths, and numbers should come from DATA, not be invented or assumed.
5. Write for an engineering manager's decision-making, not a developer's code review: frame risks in terms of team exposure, and frame recommendations as things a manager could actually do (assign a pairing session, request documentation as part of a sprint, flag a hire/backfill need) rather than pure code-level advice like "add comments."
6. No marketing language, no hedging filler, no apologizing for the analysis.

Respond only with the requested JSON structure.`;

/**
 * Gemini's `responseSchema` — the structural half of the "AI must not
 * invent scores" guarantee. There is no numeric field anywhere in this
 * schema, so even a model that wanted to fabricate a score has no field
 * to put it in; every value the model returns is prose.
 */
export const RISK_EXPLANATION_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    repositorySummary: { type: "STRING" },
    topRisks: { type: "ARRAY", items: { type: "STRING" } },
    recommendations: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["repositorySummary", "topRisks", "recommendations"],
} as const;

/**
 * Builds the user-turn prompt: a DATA block (the only source of numbers
 * the model may use) followed by the task description. Keeping DATA
 * serialization and task instructions in one place makes it easy to see
 * exactly what the model does and doesn't have access to.
 */
export function buildRiskExplanationPrompt(input: AIExplanationInput): string {
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

Task: produce three things from this DATA, and nothing else, written for an engineering manager:
- repositorySummary: 2-3 sentences summarizing this repository's overall knowledge-concentration risk posture, in terms of team exposure.
- topRisks: 3-5 short bullet points, each naming a specific, concrete risk grounded in DATA (name real contributors/files/numbers from DATA where relevant).
- recommendations: 3-5 short, actionable bullet points an engineering manager could act on this week — staffing, process, or review-allocation decisions — to reduce the risks you identified.`;
}