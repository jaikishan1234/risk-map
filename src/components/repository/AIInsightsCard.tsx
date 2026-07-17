import ReactMarkdown from "react-markdown";
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AIExplanationOutput } from "@/lib/validation/ai-explanation.schema";

interface AIInsightsCardProps {
  data: AIExplanationOutput;
}

/**
 * Renders a single line of AI-generated text as inline markdown (bold,
 * italics, inline code) without wrapping it in a block-level <p>, so it
 * sits naturally inside a flex list item instead of adding its own
 * paragraph margin.
 *
 * Safety note: react-markdown parses markdown into React elements
 * directly — it does NOT interpret or render raw HTML/script tags from
 * the source text unless the rehype-raw plugin is explicitly added
 * (it isn't, here). That means even though this text originates from an
 * LLM response and should be treated as untrusted, there's no
 * dangerouslySetInnerHTML anywhere in this path and no way for the model
 * to inject executable markup — worst case, literal "<script>" text
 * renders as visible plain text, not as a tag.
 */
function InlineMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        // Unwrap the default block-level <p> so this renders inline.
        p: ({ children }) => <>{children}</>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export function AIInsightsCard({ data }: AIInsightsCardProps) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          via Gemini
        </span>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="prose-sm text-sm leading-relaxed text-foreground [&_p]:m-0">
          <ReactMarkdown>{data.repositorySummary}</ReactMarkdown>
        </div>

        {/* Top Risks */}
        <div>
          <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Top Risks
          </h4>
          <ul className="space-y-2">
            {data.topRisks.map((risk, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-lg border border-border/80 bg-destructive/5 p-2.5 text-sm text-foreground"
              >
                <AlertTriangle
                  className="mt-0.5 size-3.5 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <span>
                  <InlineMarkdown text={risk} />
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div>
          <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Recommendations
          </h4>
          <ul className="space-y-2">
            {data.recommendations.map((recommendation, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-lg border border-border/80 bg-emerald-500/5 p-2.5 text-sm text-foreground"
              >
                <Lightbulb
                  className="mt-0.5 size-3.5 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                <span>
                  <InlineMarkdown text={recommendation} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}