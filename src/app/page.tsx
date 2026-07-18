"use client";

import { useCallback, useEffect, useRef, useState, Suspense, type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  ArrowRight,
  Braces,
  Check,
  Copy,
  GitBranch,
  GitFork,
  RotateCcw,
  ShieldAlert,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  analyzeRequestSchema,
  parseGitHubUrl,
  type AnalyzeRequest,
} from "@/lib/validation/analyze-request.schema";
import {
  useRepositoryAnalysis,
  type CoreAnalysisState,
} from "@/hooks/useRepositoryAnalysis";
import { formatCompactNumber, formatRelativeDate } from "@/utils/format";
import type { RepositoryMetadata } from "@/types/repository.types";
import { ContributorsCard } from "@/components/repository/ContributorsCard";
import { RiskDashboard } from "@/components/repository/RiskDashboard";
import { TopRiskyFilesTable } from "@/components/repository/TopRiskyFilesTable";
import { AIInsightsCard } from "@/components/repository/AIInsightsCard";
import { ThemeToggle } from "@/components/theme-toggle";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorMessageCard } from "@/components/ErrorMessageCard";
import { generateCodeownersContent } from "@/lib/export/generate-codeowners";
import { downloadTextFile } from "@/utils/download-text-file";
import {
  RepositoryPreviewSkeleton,
  RiskDashboardSkeleton,
  ContributorsCardSkeleton,
  TopRiskyFilesTableSkeleton,
  AIInsightsCardSkeleton,
} from "@/components/repository/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListTree, Download } from "lucide-react";

export default function Home() {
  // useSearchParams requires a Suspense boundary around any component that
  // calls it, per Next.js App Router — without this, the page opts out of
  // static rendering with a build-time warning.
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { core, topRiskyFiles, aiInsights, analyze, reset } = useRepositoryAnalysis();
  const isLoading = core.status === "loading";
  const hasAutoAnalyzed = useRef(false);
  const [analyzedUrl, setAnalyzedUrl] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AnalyzeRequest>({
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { repositoryUrl: "" },
  });

  // Runs an analysis AND updates the URL to `?repo=owner/name`, so the
  // resulting page is a link you can copy and share — pasting it re-runs
  // the same analysis automatically on load (see the effect below).
  // router.push (not replace) so browser back/forward moves between
  // previously analyzed repos, rather than only ever having one history entry.
  const runAnalysis = useCallback(
    (repositoryUrl: string) => {
      analyze(repositoryUrl);
      setAnalyzedUrl(repositoryUrl);
      const parsed = parseGitHubUrl(repositoryUrl);
      if (parsed) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("repo", `${parsed.owner}/${parsed.repo}`);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }
    },
    [analyze, pathname, router, searchParams]
  );

  const onSubmit = handleSubmit((data) => {
    runAnalysis(data.repositoryUrl);
  });

  // On first load, if the URL already has ?repo=owner/name (someone opened
  // a shared link), prefill the input and auto-run the analysis.
  useEffect(() => {
    if (hasAutoAnalyzed.current) return;
    const repoParam = searchParams.get("repo");
    if (!repoParam) return;

    hasAutoAnalyzed.current = true;
    const repositoryUrl = `https://github.com/${repoParam}`;
    setValue("repositoryUrl", repositoryUrl);
    setAnalyzedUrl(repositoryUrl);
    analyze(repositoryUrl);
    // Intentionally not calling runAnalysis here — the URL already has
    // the right ?repo= param from the link itself, no need to rewrite it.
  }, [searchParams, setValue, analyze]);

  // Formats the already-fetched Top Risky Files data into a real,
  // downloadable CODEOWNERS file — pure client-side, no extra API calls,
  // since the data driving it is already sitting in `topRiskyFiles`.
  const handleExportCodeowners = useCallback(() => {
    if (topRiskyFiles.status !== "success") return;
    const parsed = parseGitHubUrl(analyzedUrl);
    const repoLabel = parsed ? `${parsed.owner}/${parsed.repo}` : analyzedUrl;
    const content = generateCodeownersContent(topRiskyFiles.data, repoLabel);
    downloadTextFile("CODEOWNERS", content);
  }, [topRiskyFiles, analyzedUrl]);

  // Clears results, the form, and the ?repo= param, then scrolls back to
  // the input — lets someone analyze a different repo without manually
  // clearing the field or scrolling up past a long results page.
  const handleReset = useCallback(() => {
    reset();
    setAnalyzedUrl("");
    setValue("repositoryUrl", "");
    hasAutoAnalyzed.current = false;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("repo");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [reset, setValue, searchParams, router, pathname]);

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
          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-xs text-muted-foreground sm:block">
              codebase resilience intelligence
            </span>
            <ThemeToggle />
          </div>
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

            <form
              onSubmit={onSubmit}
              noValidate
              className="mt-10 max-w-2xl rounded-2xl border border-border bg-background/80 p-3 shadow-2xl shadow-primary/5 backdrop-blur"
            >
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
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="https://github.com/owner/repository"
                    aria-invalid={errors.repositoryUrl ? "true" : "false"}
                    aria-describedby={
                      errors.repositoryUrl ? "repository-url-error" : undefined
                    }
                    className={[
                      "h-12 border-border bg-muted/40 pl-10 text-sm shadow-none",
                      errors.repositoryUrl && "border-destructive focus-visible:ring-destructive/30",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    {...register("repositoryUrl", {
                      validate: (value) => {
                        const result =
                          analyzeRequestSchema.shape.repositoryUrl.safeParse(value);
                        return result.success || result.error.issues[0].message;
                      },
                    })}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 px-5"
                  disabled={isLoading}
                >
                  {isLoading ? "Analyzing…" : "Analyze repository"}
                  {!isLoading && <ArrowRight className="size-4" aria-hidden="true" />}
                </Button>
              </div>

              {errors.repositoryUrl ? (
                <p
                  id="repository-url-error"
                  role="alert"
                  className="px-1 pt-3 font-mono text-xs text-destructive"
                >
                  {errors.repositoryUrl.message}
                </p>
              ) : (
                <p className="px-1 pt-3 font-mono text-xs text-muted-foreground">
                  Public GitHub repositories · deterministic analysis · no OAuth required
                </p>
              )}
            </form>

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
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <span className="flex gap-1.5">
                    <span className="size-2 rounded-full bg-red-400" />
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span className="size-2 rounded-full bg-emerald-400" />
                  </span>
                  analysis / repository
                </div>
                <div className="flex items-center gap-2">
                  {(core.status === "success" || core.status === "error") && (
                    <NewAnalysisButton onReset={handleReset} />
                  )}
                  {core.status === "success" && <CopyLinkButton />}
                  <StatusBadge state={core} />
                </div>
              </div>

              <div className="p-5">
                <ErrorBoundary sectionName="repository preview">
                  {core.status === "idle" && <IdlePreview />}
                  {core.status === "loading" && <RepositoryPreviewSkeleton />}
                  {core.status === "error" && (
                    <ErrorMessageCard
                      message={core.message}
                      httpStatus={core.httpStatus}
                      compact
                    />
                  )}
                  {core.status === "success" && (
                    <RepositoryPreview repository={core.repository} />
                  )}
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </section>

        {core.status === "loading" && (
          <section className="space-y-6 pb-16">
            <RiskDashboardSkeleton />
            <ContributorsCardSkeleton />
          </section>
        )}

        {core.status === "success" && (
          <section className="space-y-6 pb-16">
            <ErrorBoundary sectionName="risk dashboard">
              <RiskDashboard data={core.riskDashboard} />
            </ErrorBoundary>

            <ErrorBoundary sectionName="contributors">
              <ContributorsCard contributors={core.contributors} />
            </ErrorBoundary>

            {/* Top Risky Files — loads independently of the core analysis above. */}
            <ErrorBoundary sectionName="top risky files">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border pb-4">
                  <ListTree className="size-4 text-primary" aria-hidden="true" />
                  <CardTitle className="text-sm font-medium">
                    Top Risky Files
                  </CardTitle>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
                      sampled from largest code files
                    </span>
                    {topRiskyFiles.status === "success" && (
                      <button
                        type="button"
                        onClick={handleExportCodeowners}
                        aria-label="Download a CODEOWNERS file for the highest-risk files"
                        className="flex items-center gap-1 rounded-full border border-border bg-background/70 px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Download className="size-3" aria-hidden="true" />
                        <span className="hidden sm:inline">EXPORT CODEOWNERS</span>
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  {topRiskyFiles.status === "loading" && <TopRiskyFilesTableSkeleton />}
                  {topRiskyFiles.status === "error" && (
                    <ErrorMessageCard
                      message={topRiskyFiles.message}
                      httpStatus={topRiskyFiles.httpStatus}
                      compact
                    />
                  )}
                  {topRiskyFiles.status === "success" && (
                    <TopRiskyFilesTable
                      files={topRiskyFiles.data}
                      repositoryUrl={analyzedUrl}
                    />
                  )}
                </CardContent>
              </Card>
            </ErrorBoundary>

            {/* AI Insights — also independent; a Gemini failure (e.g. missing
                API key) never blocks the deterministic sections above. */}
            <ErrorBoundary sectionName="AI insights">
              {aiInsights.status === "loading" && <AIInsightsCardSkeleton />}
              {aiInsights.status === "error" && (
                <Card className="border-border bg-card shadow-sm">
                  <CardContent>
                    <ErrorMessageCard
                      message={aiInsights.message}
                      httpStatus={aiInsights.httpStatus}
                      compact
                    />
                  </CardContent>
                </Card>
              )}
              {aiInsights.status === "success" && (
                <AIInsightsCard data={aiInsights.data} />
              )}
            </ErrorBoundary>
          </section>
        )}
      </div>
    </main>
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, non-secure context) — fail
      // silently rather than showing an error for a non-critical action.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Link copied" : "Copy link to this analysis"}
      className="flex items-center gap-1 rounded-full border border-border bg-background/70 px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {copied ? (
        <>
          <Check className="size-3" aria-hidden="true" />
          <span className="hidden sm:inline">COPIED</span>
        </>
      ) : (
        <>
          <Copy className="size-3" aria-hidden="true" />
          <span className="hidden sm:inline">COPY LINK</span>
        </>
      )}
    </button>
  );
}

function NewAnalysisButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={onReset}
      aria-label="Start a new analysis"
      className="flex items-center gap-1 rounded-full border border-border bg-background/70 px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <RotateCcw className="size-3" aria-hidden="true" />
      <span className="hidden sm:inline">NEW ANALYSIS</span>
    </button>
  );
}

function StatusBadge({ state }: { state: CoreAnalysisState }) {
  if (state.status === "loading") {
    return (
      <span className="rounded-full bg-primary/10 px-2 py-1 font-mono text-[10px] font-medium text-primary">
        ANALYZING
      </span>
    );
  }
  if (state.status === "error") {
    return (
      <span className="rounded-full bg-destructive/10 px-2 py-1 font-mono text-[10px] font-medium text-destructive">
        ERROR
      </span>
    );
  }
  if (state.status === "success") {
    return (
      <span className="rounded-full bg-emerald-500/10 px-2 py-1 font-mono text-[10px] font-medium text-emerald-600">
        METADATA LOADED
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted px-2 py-1 font-mono text-[10px] font-medium text-muted-foreground">
      AWAITING INPUT
    </span>
  );
}

function IdlePreview() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <GitFork className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="max-w-xs font-mono text-xs text-muted-foreground">
        Paste a public GitHub repository URL to pull its metadata here.
      </p>
    </div>
  );
}

function RepositoryPreview({
  repository,
}: {
  repository: RepositoryMetadata;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-xs text-muted-foreground">{repository.name}</p>
        {repository.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-foreground">
            {repository.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatBox
          icon={<Star className="size-3.5" aria-hidden="true" />}
          label="stars"
          value={formatCompactNumber(repository.stars)}
        />
        <StatBox
          icon={<GitFork className="size-3.5" aria-hidden="true" />}
          label="forks"
          value={formatCompactNumber(repository.forks)}
        />
        <StatBox
          icon={<Braces className="size-3.5" aria-hidden="true" />}
          label="language"
          value={repository.language ?? "—"}
        />
        <StatBox
          icon={<GitBranch className="size-3.5" aria-hidden="true" />}
          label="updated"
          value={formatRelativeDate(repository.lastUpdated)}
        />
      </div>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 p-3">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}