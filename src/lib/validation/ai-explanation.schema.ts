import { z } from "zod";

/**
 * Validates the AI's response shape. Note what's deliberately absent: no
 * numeric score fields anywhere in this schema. The AI's job is to explain
 * scores that were already computed deterministically elsewhere in this
 * app (see lib/analytics/) — it has no channel through which a fabricated
 * number could flow back into the app as if it were real data, because
 * there's simply no field here for one to occupy.
 */
export const aiExplanationSchema = z.object({
  repositorySummary: z.string().min(1),
  topRisks: z.array(z.string().min(1)).min(1).max(10),
  recommendations: z.array(z.string().min(1)).min(1).max(10),
});

export type AIExplanationOutput = z.infer<typeof aiExplanationSchema>;