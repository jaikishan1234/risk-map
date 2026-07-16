/**
 * Extensions treated as binary/non-source. Deliberately conservative and
 * extension-based (not content-sniffing) — fast, no extra API calls, and
 * good enough for filtering a repo file tree down to source-analyzable files.
 * `.svg` is intentionally excluded from this list — it's XML text.
 */
const BINARY_EXTENSIONS = new Set([
  // images
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "tiff", "avif", "heic",
  // fonts
  "woff", "woff2", "ttf", "otf", "eot",
  // audio/video
  "mp3", "mp4", "mov", "avi", "webm", "ogg", "wav", "flac", "m4a", "mkv",
  // archives
  "zip", "tar", "gz", "tgz", "rar", "7z", "bz2", "xz",
  // compiled/binary artifacts
  "exe", "dll", "so", "dylib", "bin", "class", "pyc", "o", "obj", "wasm",
  "node",
  // documents (binary formats, not source)
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  // design files
  "psd", "ai", "sketch", "fig",
  // misc binary data
  "db", "sqlite", "sqlite3", "dat", "pack", "jar", "war",
]);

/**
 * Returns true if `path` looks like a binary file based on its extension.
 * Files with no extension are treated as non-binary (e.g. "Dockerfile",
 * "Makefile") since those are almost always source/text files.
 */
export function isBinaryFile(path: string): boolean {
  const lastDot = path.lastIndexOf(".");
  const lastSlash = path.lastIndexOf("/");

  // No extension, or the dot belongs to a directory segment, not the filename.
  if (lastDot === -1 || lastDot < lastSlash) {
    return false;
  }

  const extension = path.slice(lastDot + 1).toLowerCase();
  return BINARY_EXTENSIONS.has(extension);
}