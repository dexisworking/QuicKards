// ============================================
// QUICKARDS — Output ZIP assembly
// ============================================
//
// SERVER ONLY. Adapted from v1 (`render/engine.ts:251`). Buffers the archive in
// memory and returns it, so the caller can hand it straight to R2. Fine at the
// batch sizes here; a very large job would stream directly to an R2 multipart
// upload instead (Phase 11).

import archiver from "archiver";
import { PassThrough } from "node:stream";

export type ZipEntry = { name: string; data: Buffer };

export async function buildOutputZip(entries: ZipEntry[]): Promise<Buffer> {
  const output = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];

  const done = new Promise<Buffer>((resolve, reject) => {
    output.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    output.on("end", () => resolve(Buffer.concat(chunks)));
    output.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(output);
  for (const entry of entries) archive.append(entry.data, { name: entry.name });
  await archive.finalize();

  return done;
}

/** Make a card_id safe as a ZIP entry filename — a card_id can contain slashes
 *  or other characters that would create surprise subfolders or break the
 *  archive. The R2 key is hashed separately; this is only the human-facing name
 *  inside the ZIP. */
export function safeEntryName(cardId: string): string {
  return cardId.replace(/[^a-zA-Z0-9._-]+/g, "_") || "card";
}
