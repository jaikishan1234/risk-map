import {
  AlertCircle,
  Clock,
  SearchX,
  ServerCrash,
  WifiOff,
  CircleAlert,
} from "lucide-react";

import { getErrorKind, getErrorDisplayText, type ErrorKind } from "@/utils/error-messages";

interface ErrorMessageCardProps {
  /** The specific message from the server (e.g. GitHubServiceError.message). */
  message: string;
  /** HTTP status from the failed response, if the request reached the server at all. */
  httpStatus?: number;
  /** Compact mode for smaller inline slots (e.g. a card that's mostly other content). */
  compact?: boolean;
}

const ERROR_ICON: Record<ErrorKind, typeof AlertCircle> = {
  invalid: AlertCircle,
  "not-found": SearchX,
  "rate-limit": Clock,
  server: ServerCrash,
  network: WifiOff,
  unknown: CircleAlert,
};

export function ErrorMessageCard({
  message,
  httpStatus,
  compact = false,
}: ErrorMessageCardProps) {
  const kind = getErrorKind(httpStatus);
  const { title, hint } = getErrorDisplayText(kind);
  const Icon = ERROR_ICON[kind];

  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-2 text-center ${
        compact ? "py-4" : "py-8"
      }`}
    >
      <Icon
        className={compact ? "size-6 text-destructive" : "size-8 text-destructive"}
        aria-hidden="true"
      />
      <p className="font-mono text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-xs font-mono text-xs text-destructive">{message}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}