// ============================================
// QUICKARDS — ZIP photo extraction
// ============================================
//
// Unpacks a ZIP of card photos and maps each entry to a card_id by filename —
// the bulk-photo workflow that is the whole point of the product. Preserves
// v1's behaviour (`images/zip/route.ts`): directory entries skipped, card_id
// derived from the filename, MIME from the extension.
//
// Extraction only. Uploading to R2 and upserting asset rows is the service's
// job (service.ts), so this stays pure and unit-testable against a fixture ZIP.

import JSZip from "jszip";

import {
  contentTypeForExtension,
  extensionFromFilename,
  getCardIdFromFilename,
  isImageFilename,
} from "./filename";

export type PhotoEntry = {
  cardId: string;
  filename: string;
  contentType: string;
  bytes: Uint8Array;
};

export type ExtractedPhotos = {
  entries: PhotoEntry[];
  /** Counts of what was NOT imported, for an honest "N of M imported" summary.
   *  v1 silently dropped these. */
  skipped: {
    /** Entries with no derivable card_id. */
    noCardId: number;
    /** Non-image entries (a stray README, .DS_Store, Thumbs.db). */
    notImage: number;
  };
};

/**
 * Extract importable photo entries from ZIP bytes.
 *
 * Two entries mapping to the same card_id is legal and expected (a corrected
 * re-export): later entries win, matching v1 where the last upsert for a card
 * was the one that stuck. Deduping to last-wins here keeps the caller from
 * uploading the same card twice.
 */
export async function extractImageEntries(zipBytes: Uint8Array): Promise<ExtractedPhotos> {
  const zip = await JSZip.loadAsync(zipBytes);
  const files = Object.values(zip.files).filter((entry) => !entry.dir);

  const skipped = { noCardId: 0, notImage: 0 };
  // card_id -> entry, so a duplicated card resolves to the last one seen.
  const byCard = new Map<string, PhotoEntry>();

  for (const file of files) {
    // Skip macOS resource-fork noise that ZIPs love to carry.
    if (file.name.startsWith("__MACOSX/") || file.name.split("/").pop()?.startsWith("._")) {
      continue;
    }

    if (!isImageFilename(file.name)) {
      skipped.notImage += 1;
      continue;
    }

    const cardId = getCardIdFromFilename(file.name);
    if (!cardId) {
      skipped.noCardId += 1;
      continue;
    }

    const bytes = await file.async("uint8array");
    byCard.set(cardId, {
      cardId,
      filename: file.name,
      contentType: contentTypeForExtension(extensionFromFilename(file.name)),
      bytes,
    });
  }

  return { entries: [...byCard.values()], skipped };
}
