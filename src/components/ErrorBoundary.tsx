"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Shown in the fallback UI to help identify which section crashed. */
  sectionName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * React error boundaries only catch errors thrown during rendering,
 * lifecycle methods, and constructors of the tree below them — NOT errors
 * in event handlers or async code (fetch failures, GitHubServiceError,
 * GeminiServiceError, etc.). Those are already handled via the
 * loading/error/success state in useRepositoryAnalysis and rendered with
 * ErrorMessageCard.
 *
 * This component is a different, complementary safety net: it's for the
 * unexpected case — a rendering bug, a chart library choking on an
 * unusual data shape, a null reference — that would otherwise crash the
 * whole page to a blank white screen. Wrapping independent sections
 * (rather than one boundary around the entire app) means one section
 * crashing doesn't take the rest of the page down with it.
 *
 * Must be a class component — React does not provide a hook-based
 * equivalent for componentDidCatch/getDerivedStateFromError.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `ErrorBoundary caught an error in "${this.props.sectionName ?? "unknown section"}":`,
      error,
      errorInfo
    );
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <TriangleAlert className="size-6 text-destructive" aria-hidden="true" />
          <p className="font-mono text-sm font-medium text-foreground">
            {this.props.sectionName
              ? `The ${this.props.sectionName} section hit an unexpected error`
              : "This section hit an unexpected error"}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            The rest of the page should still work fine. You can try
            reloading just this section, or refresh the page.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="mt-1"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}