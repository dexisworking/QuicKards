// ============================================
// QUICKARDS — R2 object key layout
// ============================================
//
// Every key is prefixed by `org/{orgId}/`. That is not cosmetic: closing an
// organization becomes a single prefix delete-listing rather than a scan, and
// it makes per-tenant storage accounting trivial.
//
// KEYS NEVER CONTAIN USER INPUT. Photos are keyed by the asset's UUID, not by
// the CSV `card_id` — a card_id like "EMP/001" or "../secret" would otherwise
// inject path segments, and two distinct ids that sanitize to the same string
// would silently overwrite each other's photo. The card_id lives in the DB row;
// the R2 key is a collision-free uuid. Only the file extension is derived from
// user input, and it is clamped to a short allowlist below.

const PHOTO_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "avif"]);
const FONT_EXTS = new Set(["ttf", "otf", "woff", "woff2"]);

/** Clamp a user-supplied filename's extension to a known-safe token, defaulting
 *  when it is missing or unrecognised. Lowercased, alphanumeric only. */
export function safeExt(filename: string, allow: Set<string>, fallback: string): string {
  const raw = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  return allow.has(raw) ? raw : fallback;
}

export const photoExt = (filename: string) => safeExt(filename, PHOTO_EXTS, "png");
export const fontExt = (filename: string) => safeExt(filename, FONT_EXTS, "ttf");

export const keys = {
  /** A per-card photo. Keyed by assetId (uuid), not card_id. */
  cardPhoto: (orgId: string, projectId: string, assetId: string, ext: string) =>
    `org/${orgId}/project/${projectId}/photos/${assetId}.${ext}`,

  /** A template's background image. */
  templateBackground: (orgId: string, templateId: string, assetId: string, ext: string) =>
    `org/${orgId}/template/${templateId}/background/${assetId}.${ext}`,

  /** An uploaded custom font. */
  font: (orgId: string, fontId: string, ext: string) => `org/${orgId}/font/${fontId}.${ext}`,

  /** A render job's output ZIP. Lifecycle-expired after 7 days (Phase 11). */
  jobOutput: (orgId: string, jobId: string) => `org/${orgId}/job/${jobId}/output.zip`,

  /** Public gallery thumbnail — NOT org-scoped, served from a public domain. */
  galleryThumb: (galleryTemplateId: string) => `gallery/${galleryTemplateId}/thumb.png`,

  /** The prefix covering everything an org owns — for bulk deletion on close. */
  orgPrefix: (orgId: string) => `org/${orgId}/`,
} as const;
