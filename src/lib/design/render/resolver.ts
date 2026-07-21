// ============================================
// QUICKARDS — Resource resolver contract
// ============================================
//
// The one place client and server rendering legitimately differ, isolated
// behind an interface so `build.ts` never branches on environment.
//
// In the editor an image is a `blob:` or `https:` href the browser fetches
// itself, and a font is already registered with `document.fonts`.
//
// On the server neither is true. resvg performs ZERO I/O — no remote images,
// no remote fonts, no system fonts (we pass `loadSystemFonts: false` for
// determinism). Every byte must be inlined as a `data:` URI or handed over as
// a buffer. An unresolved resource does not error; it renders as nothing at
// all, which is precisely why `resolveImage` returning null must produce a
// RenderWarning rather than being quietly skipped.

import type { FontRef, ImageSource } from "../schema";

export type ResolvedImage = {
  /** Either a `data:` URI (server) or a `blob:`/`https:` URL (client). */
  href: string;
  /** Intrinsic pixel dimensions, needed to compute cover/contain geometry.
   *  Unknown intrinsic size forces `fill`, which distorts — so resolvers
   *  should work hard to supply this. */
  width: number;
  height: number;
};

/** Glyph advance data for one font, used for wrapping and autoFit.
 *
 *  Measurement and painting MUST reference the same font bytes. If the
 *  measurer sees Inter and the painter sees a fallback, the wrap computed here
 *  disagrees with what lands on screen — and the user positions elements
 *  against metrics that are about to change under them. */
export interface FontMetrics {
  /** Advance width of `text` at `fontSize`, in px, including letterSpacing. */
  measure(text: string, fontSize: number, letterSpacing: number): number;
  /** Distance from the text baseline to the top of the em box, in px. */
  ascender(fontSize: number): number;
  descender(fontSize: number): number;
}

export interface ResourceResolver {
  /**
   * Resolve an image for painting. Returns null when the source cannot be
   * found — callers emit an `image-missing` warning and skip the node.
   *
   * `row` is passed because ImageSource can be column-bound (the per-card
   * photo case), which is the single most common image in this product.
   */
  resolveImage(
    src: ImageSource,
    row: Record<string, string> | null,
  ): Promise<ResolvedImage | null>;

  /**
   * Metrics for a font, or null if it is unavailable. Null triggers a
   * `font-missing` warning and a fall back to the default family — visibly,
   * not silently.
   */
  resolveFont(family: string, weight: number, style: "normal" | "italic"): FontMetrics | null;

  /**
   * Fonts to embed in the emitted SVG.
   *
   * Server-side this returns `@font-face` rules with base64 `data:` URIs,
   * inlined into a <style> element, because resvg will not fetch a font over
   * the network. Client-side it returns an empty array — the browser already
   * has the faces registered via the FontFace API, and duplicating them into
   * every re-render would thrash the font cache.
   */
  fontFaceRules(fonts: FontRef[]): string[];
}
