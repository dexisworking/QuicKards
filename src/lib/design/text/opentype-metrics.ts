// ============================================
// QUICKARDS — FontMetrics from real font files
// ============================================
//
// opentype.js parses an ArrayBuffer and runs in both environments, so ONE
// implementation serves the editor and the server. That matters more than it
// looks: if the browser measured with the Canvas API and the server measured
// with opentype, the two would round differently and wrapped text would break
// at different words in the editor than in print — reintroducing exactly the
// class of divergence this rebuild exists to remove.
//
// v1 did use opentype (`engine.ts:84-121`) to convert glyphs to outlines, but
// only on the server, and only as a fallback path that was never actually
// reached because `customFonts` was never passed in.

import opentype from "opentype.js";

import type { FontMetrics } from "../render/resolver";
import { cached } from "./metrics";

/**
 * Build FontMetrics from font file bytes.
 *
 * Returns null rather than throwing on a corrupt or unsupported file — the
 * caller turns that into a `font-missing` warning and falls back visibly. A
 * throw here would fail an entire 2,000-card batch because one user uploaded a
 * .ttf that was really a .zip.
 */
export function metricsFromBuffer(buffer: ArrayBuffer): FontMetrics | null {
  let font: opentype.Font;
  try {
    font = opentype.parse(buffer);
  } catch {
    return null;
  }

  const unitsPerEm = font.unitsPerEm || 1000;
  const ascender = font.ascender / unitsPerEm;
  const descender = Math.abs(font.descender) / unitsPerEm;

  return cached({
    measure(text, fontSize, letterSpacing) {
      if (text.length === 0) return 0;
      // `advanceWidth` sums glyph advances including kerning at the given size.
      const advance = font.getAdvanceWidth(text, fontSize);
      // letterSpacing applies between glyphs, not after the last one. Counting
      // code points rather than UTF-16 units so emoji and combining marks do
      // not each get counted twice.
      const gaps = Math.max(0, [...text].length - 1);
      return advance + gaps * letterSpacing;
    },
    ascender: (fontSize) => ascender * fontSize,
    descender: (fontSize) => descender * fontSize,
  });
}

/** Node/Buffer convenience — Buffer is a Uint8Array view, and slicing by
 *  byteOffset avoids handing opentype the whole pooled allocation Node reuses
 *  for small reads, which would make it parse adjacent garbage. */
export function metricsFromBytes(bytes: Uint8Array): FontMetrics | null {
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return metricsFromBuffer(copy as ArrayBuffer);
}
