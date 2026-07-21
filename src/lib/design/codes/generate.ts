// ============================================
// QUICKARDS — Code symbology → SVG path
// ============================================
//
// Isomorphic by design. v1 called `QRCode.toBuffer()` and composited a raster
// (`engine.ts`), which meant the editor could not show a real code at all —
// it painted a dashed green placeholder rectangle and the user found out what
// the code actually looked like only after rendering. Emitting path data
// instead means the same geometry paints in the editor and in output, and
// scales losslessly at any DPI.
//
// `qrcode`'s `create()` is synchronous and runs in both environments; only its
// `toBuffer`/`toCanvas` surfaces are environment-specific, and we use neither.

import { create as createQr } from "qrcode";

import { round } from "../geometry";
import type { CodeNode } from "../schema";

export type CodeResult =
  | { ok: true; path: string; /** Module grid size, for quiet-zone maths. */ modules: number }
  | { ok: false; reason: string };

/** Symbologies we can actually emit today. Linear barcodes need a generator
 *  (bwip-js) that is not yet a dependency — see the note in `generateCode`. */
const SUPPORTED = new Set<CodeNode["symbology"]>(["qr"]);

/**
 * Build SVG path data for a code, normalised into a `size` × `size` box.
 *
 * Every dark module becomes one subpath in a single <path>. Emitting ~400
 * separate <rect> elements — the naive approach, and what most QR-to-SVG
 * helpers do — inflates the document, slows resvg measurably on batch renders,
 * and gives the browser 400 more nodes to lay out per card in the editor.
 * One path with 400 subpaths rasterizes identically.
 */
export function generateCode(node: CodeNode, value: string, size: number): CodeResult {
  if (!SUPPORTED.has(node.symbology)) {
    // Deliberately a soft failure with a reason rather than a throw. One
    // unsupported code on card 1,700 of 2,000 must not fail the whole batch —
    // it renders without that element and reports a `code-failed` warning.
    return {
      ok: false,
      reason: `Symbology "${node.symbology}" is not supported yet (QR only)`,
    };
  }

  if (value.length === 0) {
    return { ok: false, reason: "Value is empty" };
  }

  let qr: { modules: { size: number; data: ArrayLike<number> } };
  try {
    qr = createQr(value, { errorCorrectionLevel: node.errorCorrection }) as typeof qr;
  } catch (error) {
    // Thrown when the value exceeds capacity for the chosen error-correction
    // level — genuinely possible with a long URL at level H.
    return { ok: false, reason: error instanceof Error ? error.message : "QR encoding failed" };
  }

  const count = qr.modules.size;
  const data = qr.modules.data;
  const total = count + node.quietZone * 2;
  const unit = size / total;

  const subpaths: string[] = [];
  for (let row = 0; row < count; row += 1) {
    // Run-length merge along each row: consecutive dark modules become one
    // wider rect. Typical QR codes compress to roughly half the subpath count,
    // and it removes the hairline seams that can appear between abutting rects
    // at fractional scales.
    let runStart = -1;
    for (let col = 0; col <= count; col += 1) {
      const dark = col < count && data[row * count + col] === 1;
      if (dark && runStart === -1) {
        runStart = col;
      } else if (!dark && runStart !== -1) {
        const x = round((runStart + node.quietZone) * unit);
        const y = round((row + node.quietZone) * unit);
        const w = round((col - runStart) * unit);
        const h = round(unit);
        subpaths.push(`M ${x} ${y} h ${w} v ${h} h ${-w} Z`);
        runStart = -1;
      }
    }
  }

  return { ok: true, path: subpaths.join(" "), modules: total };
}
