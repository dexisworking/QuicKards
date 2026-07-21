// ============================================
// QUICKARDS — SVG → PNG rasterization
// ============================================
//
// SERVER ONLY. `@resvg/resvg-js` is a native binary; it will not run on the
// Edge runtime. Every route handler and Inngest function that reaches this
// module needs `export const runtime = 'nodejs'`. The failure mode otherwise
// is an opaque bundling error that never mentions resvg.
//
// Why resvg rather than sharp (which v1 used):
//   - sharp rasterizes SVG through librsvg, which knows nothing about fonts we
//     uploaded. That is the root of v1's "custom fonts never appear" bug.
//   - resvg takes explicit fonts, so the bytes the editor measured with are
//     the bytes the output is painted with.
//   - resvg does no I/O of its own, so renders are reproducible.
//
// sharp remains a dependency and remains essential — just not as the renderer.
// It handles EXIF orientation, HEIC/AVIF decoding, and downscaling uploads.
//
// TWO VERIFIED CONSTRAINTS, both of which cost real debugging to find:
//
//   1. Fonts load ONLY from filesystem paths. There is no buffer option, and
//      `@font-face` with a base64 data: URI inside the SVG is ignored
//      entirely. Callers pass paths from `materializeFont()`.
//
//   2. An unrecognised key inside the `font` object makes the native binding
//      discard the whole object and revert to defaults — including
//      `loadSystemFonts: true`. Output then depends on the host's installed
//      fonts: correct on a dev laptop, tofu in a container. The options built
//      below therefore contain documented keys ONLY. Do not add speculative
//      ones "just in case"; the failure is silent.

import { Resvg } from "@resvg/resvg-js";

export type RasterizeOptions = {
  /** Filesystem paths to font files, from `materializeFont()`. */
  fontPaths?: string[];
  /** Family used when the document references something not supplied. */
  defaultFontFamily?: string;
  /** Output width in px. Defaults to the SVG's intrinsic width — used to
   *  render a small preview from the very same document that produces print
   *  output, so a preview can never disagree with the final card. */
  width?: number;
  /**
   * Permit the host's installed fonts.
   *
   * Defaults to FALSE, and should stay false in production: a render must not
   * depend on where it ran. Exposed only so a local tool can opt in
   * deliberately, never as a fallback when a font fails to load — falling back
   * is what made v1's font bug invisible.
   */
  allowSystemFonts?: boolean;
};

export function rasterize(svg: string, options: RasterizeOptions = {}): Buffer {
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: options.fontPaths ?? [],
      loadSystemFonts: options.allowSystemFonts ?? false,
      defaultFontFamily: options.defaultFontFamily ?? "Inter",
    },
    fitTo: options.width ? { mode: "width", value: options.width } : { mode: "original" },
    // Text quality over speed. Card text is a few dozen glyphs, so the cost is
    // irrelevant and the legibility at print resolution is not.
    textRendering: 2, // geometricPrecision
    shapeRendering: 2, // geometricPrecision
  });

  return resvg.render().asPng();
}
