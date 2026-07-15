import { ArrowRight, Braces, GitBranch, GitFork, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border),transparent_55%)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border),transparent_55%)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary),transparent_88%),transparent_65%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 lg:px-8">
        <header className="flex h-20 items-center justify-between">
          <a className="flex items-center gap-2 font-semibold tracking-tight" href="#top">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GitBranch className="size-4" aria-hidden="true" />
            </span>
            Single Point
          </a>
          <span className="hidden font-mono text-xs text-muted-foreground sm:block">
            codebase resilience intelligence
          </span>
        </header>

        <section
          id="top"
          className="grid flex-1 items-center gap-16 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24"
        >
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5 font-mono text-xs text-muted-foreground shadow-sm backdrop-blur">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Ownership risk, surfaced early
            </div>

            <h1 className="text-balance text-5xl font-semibold tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Find the people your codebase{" "}
              <span className="text-muted-foreground">cannot afford to lose.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
              Turn Git history into an actionable map of knowledge concentration,
              single-owner files, and the work most exposed to handoff risk.
            </p>

            <div className="mt-10 max-w-2xl rounded-2xl border border-border bg-background/80 p-3 shadow-2xl shadow-primary/5 backdrop-blur">
              <label className="sr-only" htmlFor="repository-url">
                GitHub repository URL
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <GitFork
                    className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="repository-url"
                    type="url"
                    placeholder="https://github.com/owner/repository"
                    className="h-12 border-border bg-muted/40 pl-10 text-sm shadow-none"
                  />
                </div>
                <Button type="button" size="lg" className="h-12 px-5">
                  Analyze repository
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <p className="px-1 pt-3 font-mono text-xs text-muted-foreground">
                Public GitHub repositories · deterministic analysis · no OAuth required
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-primary" aria-hidden="true" />
                Surface critical ownership gaps
              </span>
              <span className="flex items-center gap-2">
                <Braces className="size-4 text-primary" aria-hidden="true" />
                Grounded in commit history
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-primary/5 blur-3xl" />
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/10">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <span className="flex gap-1.5">
                    <span className="size-2 rounded-full bg-red-400" />
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span className="size-2 rounded-full bg-emerald-400" />
                  </span>
                  analysis / repository
                </div>
                <span className="rounded-full bg-destructive/10 px-2 py-1 font-mono text-[10px] font-medium text-destructive">
                  4 CRITICAL
                </span>
              </div>

              <div className="space-y-5 p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">knowledge concentration</p>
                    <p className="mt-1 text-4xl font-semibold tracking-tight">
                      78<span className="text-lg text-muted-foreground">/100</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-right">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">risk tier</p>
                    <p className="text-sm font-semibold text-destructive">HIGH</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <RiskRow file="src/payments/processor.ts" owner="alexchen" score={96} width="96%" tone="bg-destructive" />
                  <RiskRow file="src/auth/session.ts" owner="mira" score={82} width="82%" tone="bg-amber-500" />
                  <RiskRow file="src/queue/worker.ts" owner="alexchen" score={74} width="74%" tone="bg-amber-500" />
                  <RiskRow file="src/config/runtime.ts" owner="4 contributors" score={31} width="31%" tone="bg-emerald-500" />
                </div>

                <div className="rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
                  <span className="text-primary">→</span> Prioritize a pairing session for{" "}
                  <span className="text-foreground">processor.ts</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function RiskRow({
  file,
  owner,
  score,
  tone,
  width,
}: {
  file: string;
  owner: string;
  score: number;
  tone: string;
  width: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 p-3">
      <div className="flex items-center justify-between gap-3 font-mono text-xs">
        <span className="truncate text-foreground">{file}</span>
        <span className="shrink-0 font-semibold">{score}</span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={["h-full rounded-full", tone].join(" ")} style={{ width }} />
      </div>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground">top owner: {owner}</p>
    </div>
  );
}
