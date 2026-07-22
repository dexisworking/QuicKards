// ============================================
// QUICKARDS — Ingest orchestration
// ============================================
//
// Ties the pure ingest pieces to storage + DB, behind the org scope. Route
// handlers call these; everything tenant-sensitive goes through the scoped
// repository, and R2 keys are built from the scope's org id.
//
// Ownership is checked BEFORE any R2 upload — we never spend bandwidth writing
// photos for a project the caller does not own.

import { OrgScopeError, scoped, type OrgScope } from "@/lib/db/scope";
import { keys } from "@/lib/storage/keys";
import { putObject } from "@/lib/storage/r2";
import { normalizeRows, type CsvRow } from "./csv";
import { extractImageEntries } from "./zip";

export type CsvIngestResult = {
  imported: number;
  skippedNoCardId: number;
};

export type ZipIngestResult = {
  imported: number;
  skipped: { noCardId: number; notImage: number };
};

/**
 * Merge CSV rows into a project's card_data.
 *
 * `rows` are already parsed (the route decides between a file, a `csv` text
 * field, and a `rows` JSON body, then calls this). Upsert-by-card_id and the
 * `data_uploaded` status transition are preserved from v1.
 */
export async function ingestCsvRows(
  scope: OrgScope,
  projectId: string,
  rows: CsvRow[],
): Promise<CsvIngestResult> {
  const repo = scoped(scope);
  await requireProject(repo, projectId);

  const normalized = normalizeRows(rows);
  if (normalized.rows.length > 0) {
    await repo.cardData.upsertRows(projectId, normalized.rows);
    await repo.projects.setStatus(projectId, "data_uploaded");
  }

  return { imported: normalized.rows.length, skippedNoCardId: normalized.skippedNoCardId };
}

/**
 * Unpack a photo ZIP, upload each image to R2, and upsert the asset rows.
 *
 * Uploads run with bounded concurrency rather than v1's strictly-sequential
 * loop (`images/zip/route.ts:58`) — 500 photos one-at-a-time is minutes of
 * dead time. R2 keys are deterministic per card, so a retried batch overwrites
 * rather than duplicating.
 */
export async function ingestZip(
  scope: OrgScope,
  projectId: string,
  zipBytes: Uint8Array,
): Promise<ZipIngestResult> {
  const repo = scoped(scope);
  await requireProject(repo, projectId);

  const { entries, skipped } = await extractImageEntries(zipBytes);

  const photos = await mapLimit(entries, 8, async (entry) => {
    const key = keys.cardPhoto(scope.organizationId, projectId, entry.cardId);
    await putObject(key, entry.bytes, entry.contentType);
    return {
      cardId: entry.cardId,
      r2Key: key,
      contentType: entry.contentType,
      byteSize: entry.bytes.byteLength,
    };
  });

  if (photos.length > 0) {
    await repo.assets.upsertCardPhotos(projectId, photos);
    await repo.projects.setStatus(projectId, "images_uploaded");
  }

  return { imported: photos.length, skipped };
}

async function requireProject(repo: ReturnType<typeof scoped>, projectId: string): Promise<void> {
  const project = await repo.projects.byId(projectId);
  if (!project) {
    throw new OrgScopeError(`Project ${projectId} not found in this organization`);
  }
}

/** Run `fn` over `items` with at most `limit` in flight, preserving order.
 *  Small enough to inline rather than take a dependency; the render pipeline
 *  (Phase 5) reuses the same shape at larger scale. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}
