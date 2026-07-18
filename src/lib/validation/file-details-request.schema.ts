import { z } from "zod";
import { analyzeRequestSchema } from "@/lib/validation/analyze-request.schema";

export const fileDetailsRequestSchema = analyzeRequestSchema.extend({
  path: z.string().trim().min(1, "A file path is required."),
});

export type FileDetailsRequest = z.infer<typeof fileDetailsRequestSchema>;