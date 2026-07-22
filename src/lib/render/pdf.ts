// ============================================
// QUICKARDS — Combined PDF assembly
// ============================================
//
// SERVER ONLY. Adapted from v1 (`render/engine.ts:239`). Each card PNG becomes
// one full-bleed page at the card's pixel dimensions — a print shop imposes
// these onto sheets, so one card per page at exact size is what they want.
//
// Renderer-agnostic: it takes PNG buffers, so it is unchanged by the move from
// v1's sharp compositor to the v2 resvg pipeline.

import { PDFDocument } from "pdf-lib";

/**
 * One PDF, one page per PNG, each page sized to the card in points == pixels.
 *
 * pdf-lib holds the whole document (and every embedded image) in memory. That
 * is fine at the batch sizes v1 handled and is a known ceiling for very large
 * jobs — Phase 11 can switch huge jobs to a per-page or streamed strategy.
 */
export async function buildCombinedPdf(
  pngBuffers: Buffer[],
  width: number,
  height: number,
): Promise<Buffer> {
  const pdf = await PDFDocument.create();

  for (const png of pngBuffers) {
    const image = await pdf.embedPng(png);
    const page = pdf.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }

  return Buffer.from(await pdf.save());
}
