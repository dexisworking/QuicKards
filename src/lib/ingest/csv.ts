// ============================================
// QUICKARDS — CSV parsing & row normalization
// ============================================
//
// `parseCsvContent` is PRESERVED VERBATIM from v1 (`src/lib/csv/parse.ts`).
// Its exact behaviour — header:true, skipEmptyLines, trimmed headers and
// values, dropping all-empty rows — is user-visible contract. Every CSV that
// imported yesterday must import identically. Pinned by csv.test.ts.
//
// Everything else here is the row-key handling lifted out of v1's route
// (`data/route.ts:19` normalizeRows), so it can be unit-tested and reused
// rather than living inline in a handler.

import Papa from "papaparse";

import { normalizeColumnKey } from "@/lib/design/bindings";

export type CsvRow = Record<string, string>;

/** One normalized, importable row: its card_id key plus the whole original
 *  row (card_id included) stored as the merge data — exactly as v1 stored it. */
export type IngestRow = { cardId: string; data: CsvRow };

/** Preserved from v1 as a hard cap. Becomes a per-plan limit in Phase 8
 *  (`maxRowsPerProject`) rather than a constant, so paid tiers can exceed it
 *  without a code change. */
export const MAX_ROWS = 5000;

/** PRESERVED VERBATIM from v1 `parseCsvContent`. Do not "clean up". */
export function parseCsvContent(content: string): CsvRow[] {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((item) => item.message).join(", "));
  }

  return parsed.data
    .map((row) =>
      Object.entries(row).reduce<CsvRow>((acc, [key, value]) => {
        acc[key] = typeof value === "string" ? value.trim() : "";
        return acc;
      }, {}),
    )
    .filter((row) => Object.values(row).some((value) => value !== ""));
}

export type NormalizedRows = {
  rows: IngestRow[];
  /** Rows dropped for having no card_id — surfaced so the UI can say "12 rows
   *  skipped (missing card_id)" instead of silently importing fewer than the
   *  user's file contained. */
  skippedNoCardId: number;
};

/**
 * Extract the card_id key from each row and drop rows that lack one.
 *
 * `card_id` (or `cardId`) is mandatory and is the merge primary key — this is
 * the invariant the whole product is built around. Preserved from v1
 * (`data/route.ts:19`), which accepted both spellings and trimmed.
 */
export function normalizeRows(rows: CsvRow[]): NormalizedRows {
  const out: IngestRow[] = [];
  let skipped = 0;

  for (const row of rows) {
    const cardId = (row.card_id ?? row.cardId ?? "").trim();
    if (!cardId) {
      skipped += 1;
      continue;
    }
    out.push({ cardId, data: row });
  }

  return { rows: out, skippedNoCardId: skipped };
}

/**
 * Headers that collide once normalized — e.g. "Full Name" and "full_name".
 *
 * v1 had no check for this, so two such columns would both fuzzy-match the same
 * template field and the LAST one silently won. Reporting them lets the import
 * UI warn the user rather than producing quietly-wrong cards. Non-fatal by
 * design: a collision is a warning, not a rejection.
 */
export function detectHeaderCollisions(headers: string[]): string[][] {
  const byKey = new Map<string, string[]>();
  for (const header of headers) {
    const key = normalizeColumnKey(header);
    if (!key) continue;
    const group = byKey.get(key) ?? [];
    group.push(header);
    byKey.set(key, group);
  }
  return [...byKey.values()].filter((group) => group.length > 1);
}
