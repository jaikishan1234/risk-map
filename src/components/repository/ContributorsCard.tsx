import { Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Contributor } from "@/types/repository.types";

interface ContributorsCardProps {
  contributors: Contributor[];
}

export function ContributorsCard({ contributors }: ContributorsCardProps) {
  const maxCommits = Math.max(...contributors.map((c) => c.commitCount), 1);

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Users className="size-4 text-primary" aria-hidden="true" />
          Top Contributors
        </CardTitle>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {contributors.length} shown
        </span>
      </CardHeader>

      <CardContent className="pt-5">
        {contributors.length === 0 ? (
          <p className="py-6 text-center font-mono text-xs text-muted-foreground">
            No contributor data available for this repository.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {contributors.map((contributor, index) => (
              <li
                key={contributor.username}
                className="flex items-center gap-3 rounded-xl border border-border/80 p-3"
              >
                <span className="w-4 shrink-0 font-mono text-[10px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <Avatar className="size-9 shrink-0 border border-border">
                  <AvatarImage
                    src={contributor.avatar}
                    alt={`${contributor.username}'s GitHub avatar`}
                  />
                  <AvatarFallback className="text-xs">
                    {contributor.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {contributor.username}
                    </span>
                    <span className="shrink-0 font-mono text-xs font-semibold text-foreground">
                      {contributor.commitCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.max(
                          (contributor.commitCount / maxCommits) * 100,
                          4
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}