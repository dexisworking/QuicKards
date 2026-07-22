// ============================================
// QUICKARDS — R2 object key layout
// ============================================
//
// Every key is prefixed by `org/{orgId}/`. That is not cosmetic: closing an
// organization becomes a single prefix delete-listing rather than a scan, and
// it makes per-tenant storage accounting trivial.
//
// KEYS NEVER CONTAIN RAW USER INPUT. A card photo is keyed by a HASH of its
// card_id, not the card_id itself — "EMP/001" or "../secret" would otherwise
// inject path segments, and a collision would let one card overwrite another's
// photo. Hashing also makes the key deterministic per (project, card_id): so
// re-uploading a card's photo overwrites the same object in place, with no
// orphan left behind. The extension is dropped entirely (Content-Type is stored
// on the object and in the DB row), so switching jpg->png on re-upload does not
// strand the old file either.

import { createHash } from "node:crypto";

const FONT_EXTS = new Set(["ttf", "otf", "woff", "woff2"]);

/** Stable, injection-proof path segment for a card_id. */
const cardSegment = (cardId: string) =>
  createHash("sha256").update(cardId).digest("hex").slice(0, 32);

/** Clamp a user-supplied filename's extension to a known-safe token, defaulting
 *  when it is missing or unrecognised. Lowercased, alphanumeric only. */
export function safeExt(filename: string, allow: Set<string>, fallback: string): string {
  const raw = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  return allow.has(raw) ? raw : fallback;
}

export const fontExt = (filename: string) => safeExt(filename, FONT_EXTS, "ttf");

export const keys = {
  /** A per-card photo. Deterministic per (project, card_id) via a hashed
   *  segment, so re-upload overwrites in place. No extension — Content-Type
   *  lives on the object and the DB row. */
  cardPhoto: (orgId: string, projectId: string, cardId: string) =>
    `org/${orgId}/project/${projectId}/photos/${cardSegment(cardId)}`,

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
