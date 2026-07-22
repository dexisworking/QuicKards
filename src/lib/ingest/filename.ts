// ============================================
// QUICKARDS — Filename → card_id, and MIME helpers
// ============================================
//
// `getCardIdFromFilename` is PRESERVED VERBATIM from v1
// (`src/lib/api/request.ts:9`). It is how a ZIP entry `photos/EMP001.jpg` maps
// to card `EMP001`. User-visible contract — pinned by filename.test.ts.
//
// The extension/MIME helpers are lifted from v1's `src/lib/storage/utils.ts`
// (deleted at Appwrite cutover) so the ingest path no longer depends on any v1
// module.

/** PRESERVED VERBATIM from v1. Strips directory (both slash styles) and the
 *  extension, then trims. Do not alter — it changes which photos match. */
export function getCardIdFromFilename(filename: string): string {
  const normalized = filename.split("\\").pop()?.split("/").pop() ?? filename;
  const base = normalized.includes(".")
    ? normalized.slice(0, normalized.lastIndexOf("."))
    : normalized;
  return base.trim();
}

/** Lowercased extension without the dot, or a fallback when absent. */
export function extensionFromFilename(filename: string, fallback = "jpg"): string {
  const dot = filename.lastIndexOf(".");
  const ext = dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
  return ext || fallback;
}

/** Content type from an extension, preserved from v1's mapping and extended
 *  with the formats sharp can now decode (avif/heic/gif). Used to set the R2
 *  object's Content-Type so a later presigned GET serves it correctly. */
export function contentTypeForExtension(extension: string): string {
  switch (extension.toLowerCase()) {
    case "png":
      return "image/png";
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "avif":
      return "image/avif";
    case "heic":
    case "heif":
      return "image/heic";
    case "pdf":
      return "application/pdf";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

/** Extensions we accept as card photos. A ZIP entry with any other extension is
 *  skipped during ingest — a stray `README.txt` or `.DS_Store` in the archive
 *  must not become a broken "photo" asset. */
export const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "avif",
  "heic",
  "heif",
]);

export function isImageFilename(filename: string): boolean {
  return IMAGE_EXTENSIONS.has(extensionFromFilename(filename, ""));
}
