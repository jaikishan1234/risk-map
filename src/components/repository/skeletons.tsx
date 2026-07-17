import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Mirrors the shape of the "analysis / repository" preview card
 * (name, description, 4 stat boxes) so the loading state previews the
 * real layout instead of a generic spinner.
 */
export function RepositoryPreviewSkeleton() {
  return (
    <div className="space-y-5" aria-live="polite" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/80 p-3">
            <Skeleton className="mb-2 h-3 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
      <span className="sr-only">Analyzing repository…</span>
    </div>
  );
}

/**
 * Mirrors RiskDashboard's 4 stat cards + 2 chart cards.
 */
export function RiskDashboardSkeleton() {
  return (
    <div className="space-y-4" aria-live="polite" aria-busy="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="border-border bg-card shadow-sm">
            <CardHeader>
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
      <span className="sr-only">Computing risk score…</span>
    </div>
  );
}

/**
 * Mirrors ContributorsCard's header + responsive grid of contributor rows.
 */
export function ContributorsCardSkeleton() {
  return (
    <Card className="border-border bg-card shadow-sm" aria-live="polite" aria-busy="true">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border pb-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </CardHeader>
      <CardContent className="pt-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-border/80 p-3"
            >
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-8" />
                </div>
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <span className="sr-only">Loading contributors…</span>
    </Card>
  );
}

/**
 * Mirrors TopRiskyFilesTable's header row + a handful of data rows.
 */
export function TopRiskyFilesTableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="grid grid-cols-4 gap-4 border-b border-border p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-16" />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, row) => (
        <div
          key={row}
          className="grid grid-cols-4 items-center gap-4 border-b border-border/60 p-3 last:border-b-0"
        >
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-5 w-10 rounded-full" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
      <span className="sr-only">Ranking risky files…</span>
    </div>
  );
}

/**
 * Mirrors AIInsightsCard's summary paragraph + two bulleted lists.
 */
export function AIInsightsCardSkeleton() {
  return (
    <Card className="border-border bg-card shadow-sm" aria-live="polite" aria-busy="true">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Skeleton className="size-4 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </CardContent>
      <span className="sr-only">Generating AI insights…</span>
    </Card>
  );
}