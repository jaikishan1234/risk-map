export type ErrorKind =
  | "invalid"
  | "not-found"
  | "rate-limit"
  | "server"
  | "network"
  | "unknown";

/**
 * Categorizes an HTTP status (from a GitHubServiceError / GeminiServiceError
 * response) into one of a small set of user-facing error kinds. `undefined`
 * status means the request never reached the server at all (e.g. offline).
 */
export function getErrorKind(status?: number): ErrorKind {
  if (status === undefined) return "network";
  if (status === 400) return "invalid";
  if (status === 404) return "not-found";
  if (status === 403 || status === 429) return "rate-limit";
  if (status >= 500) return "server";
  return "unknown";
}

interface ErrorDisplayText {
  title: string;
  /** Generic guidance shown alongside the specific server message. */
  hint: string;
}

const ERROR_DISPLAY_TEXT: Record<ErrorKind, ErrorDisplayText> = {
  invalid: {
    title: "Invalid repository URL",
    hint: "Double-check the URL — it should look like https://github.com/owner/repo.",
  },
  "not-found": {
    title: "Repository not found",
    hint: "It may be private, deleted, renamed, or misspelled.",
  },
  "rate-limit": {
    title: "GitHub rate limit reached",
    hint: "GitHub limits how many requests we can make per hour. Try again in a few minutes.",
  },
  server: {
    title: "GitHub API error",
    hint: "GitHub's API had trouble responding. This is usually temporary — try again shortly.",
  },
  network: {
    title: "Network error",
    hint: "Couldn't reach the server. Check your internet connection and try again.",
  },
  unknown: {
    title: "Something went wrong",
    hint: "An unexpected error occurred. Try again, and if it persists, use the feedback button below.",
  },
};

export function getErrorDisplayText(kind: ErrorKind): ErrorDisplayText {
  return ERROR_DISPLAY_TEXT[kind];
}