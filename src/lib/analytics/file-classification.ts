import type { RepositoryTreeEntry } from "@/types/repository.types";
import type {
  ClassifiedFile,
  FileCategory,
  FileClassificationResult,
  FileClassificationStats,
} from "@/types/analytics.types";

const TEST_PATH_SEGMENT = /(^|\/)(tests?|__tests__|spec|specs|e2e|cypress)(\/|$)/i;
const TEST_FILENAME = /[._-](test|spec)\.[a-z0-9]+$/i;

const DOC_EXTENSIONS = new Set(["md", "mdx", "rst", "adoc", "txt"]);
const DOC_FILENAMES = new Set([
  "readme", "changelog", "contributing", "license", "code_of_conduct",
  "authors", "notice", "security",
]);
const DOC_PATH_SEGMENT = /(^|\/)docs?(\/|$)/i;

const CONFIG_FILENAMES = new Set([
  "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
  "tsconfig.json", "jsconfig.json", "next.config.js", "next.config.mjs",
  "next.config.ts", "tailwind.config.js", "tailwind.config.ts",
  "webpack.config.js", "babel.config.js", "jest.config.js", "jest.config.ts",
  "vite.config.ts", "vite.config.js", ".eslintrc", ".eslintrc.js",
  ".eslintrc.json", ".prettierrc", ".prettierrc.json", ".editorconfig",
  ".gitignore", ".gitattributes", ".npmrc", ".nvmrc", "dockerfile",
  "docker-compose.yml", "docker-compose.yaml", "makefile", "procfile",
  "pyproject.toml", "requirements.txt", "pipfile", "cargo.toml", "cargo.lock",
  "gemfile", "gemfile.lock", "go.mod", "go.sum", "composer.json",
]);
const CONFIG_EXTENSIONS = new Set(["yml", "yaml", "toml", "ini", "cfg", "env"]);
const CONFIG_FILENAME_PATTERN = /^\.env(\..+)?$/i;

const CODE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "vue", "svelte",
  "py", "rb", "go", "rs", "java", "kt", "scala", "c", "h", "cpp", "hpp",
  "cs", "php", "swift", "sh", "bash", "zsh", "sql", "css", "scss", "sass",
  "less", "html", "graphql", "proto",
]);

/**
 * Classifies a single file path into one of five categories. Order of
 * checks matters: test detection runs first since test files usually
 * carry ordinary source extensions (e.g. `Button.test.tsx` would
 * otherwise register as plain "code").
 */
export function classifyFile(path: string): FileCategory {
  const filename = (path.split("/").pop() ?? path).toLowerCase();
  const lastDot = filename.lastIndexOf(".");
  const extension = lastDot > 0 ? filename.slice(lastDot + 1) : "";
  const stem = lastDot > 0 ? filename.slice(0, lastDot) : filename;

  if (TEST_PATH_SEGMENT.test(path) || TEST_FILENAME.test(filename)) {
    return "test";
  }

  if (
    DOC_EXTENSIONS.has(extension) ||
    DOC_FILENAMES.has(stem) ||
    DOC_PATH_SEGMENT.test(path)
  ) {
    return "documentation";
  }

  if (
    CONFIG_FILENAMES.has(filename) ||
    CONFIG_EXTENSIONS.has(extension) ||
    CONFIG_FILENAME_PATTERN.test(filename)
  ) {
    return "config";
  }

  if (CODE_EXTENSIONS.has(extension)) {
    return "code";
  }

  return "other";
}

/**
 * Classifies every file in a repository tree and computes aggregate
 * statistics. Directories are ignored — only `type: "file"` entries are
 * classified, since a directory has no meaningful category of its own.
 */
export function classifyFiles(
  entries: RepositoryTreeEntry[]
): FileClassificationResult {
  const files: ClassifiedFile[] = entries
    .filter((entry) => entry.type === "file")
    .map((entry) => ({
      path: entry.path,
      category: classifyFile(entry.path),
    }));

  const categories: FileCategory[] = [
    "code",
    "documentation",
    "test",
    "config",
    "other",
  ];

  const byCategory = Object.fromEntries(
    categories.map((category) => [category, 0])
  ) as Record<FileCategory, number>;

  for (const file of files) {
    byCategory[file.category] += 1;
  }

  const total = files.length;
  const percentageByCategory = Object.fromEntries(
    categories.map((category) => [
      category,
      total === 0 ? 0 : roundToOneDecimal((byCategory[category] / total) * 100),
    ])
  ) as Record<FileCategory, number>;

  const stats: FileClassificationStats = {
    total,
    byCategory,
    percentageByCategory,
  };

  return { files, stats };
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}