// ============================================
// QUICKARDS — End-to-end rasterization tests
// ============================================
//
// Proves the thing the whole rebuild rests on: a document goes through ONE
// renderer and comes out as a real PNG with the fonts it asked for.
//
// The custom-font case is the important one. In v1 an uploaded font displayed
// correctly in the editor and NEVER appeared in output, because
// `loadRenderProject` built a `customFonts` map that neither render/route.ts
// nor preview/route.ts passed to `renderCardPng`. Here the same resolver that
// supplies wrapping metrics also supplies the buffers resvg paints with, so
// the two cannot diverge.
//
// Set QUICKARDS_WRITE_FIXTURES=1 to also dump PNGs to .artifacts/ for eyeballing.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { rasterize } from "@/lib/render/rasterize";
import { emptyDocument, newId, type CardDocument } from "../schema";
import { buildDocumentIR } from "./build";
import { serializeDocument } from "./emit-string";
import { createServerResolver } from "./resolver.server";

// A font that exists on any Windows install. On CI this test skips rather than
// fails — the assertion is about our pipeline, not about the host's fonts.
const SYSTEM_FONT = "C:/Windows/Fonts/arial.ttf";
const hasFont = existsSync(SYSTEM_FONT);

const ARTIFACTS = join(process.cwd(), ".artifacts");
const shouldWrite = process.env.QUICKARDS_WRITE_FIXTURES === "1";

function save(name: string, png: Buffer) {
  if (!shouldWrite) return;
  mkdirSync(ARTIFACTS, { recursive: true });
  writeFileSync(join(ARTIFACTS, name), png);
}

/** PNG magic bytes — cheapest possible proof we got a real image back. */
function isPng(buffer: Buffer): boolean {
  return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

/** Reads the IHDR chunk, which always sits at a fixed offset in a valid PNG. */
function pngSize(buffer: Buffer): { width: number; height: number } {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Count distinct colours, as a proxy for "did anything actually paint?".
 *  A blank card is one colour; a card with text and a QR is many. */
function looksPainted(png: Buffer): boolean {
  // Cheap heuristic on the compressed stream: a solid-colour PNG compresses to
  // almost nothing. Real content does not.
  return png.byteLength > 2000;
}

async function renderToPng(document: CardDocument, fontFiles: string[] = []) {
  const fontBytes = new Map<string, Uint8Array>();
  for (const [index, path] of fontFiles.entries()) {
    fontBytes.set(`font-${index}`, new Uint8Array(readFileSync(path)));
  }

  const resolver = await createServerResolver(document.fonts, {
    loadAsset: async () => null,
    loadFont: async (id) => fontBytes.get(id) ?? null,
  });

  const { ir, warnings } = await buildDocumentIR(document, {
    sideId: document.sides[0].id,
    row: null,
    resolver,
    mode: "raster",
  });

  const svg = serializeDocument(ir);
  const png = rasterize(svg, { fontPaths: resolver.fontPaths() });
  return { png, svg, warnings };
}

const transform = (over: Record<string, number | boolean> = {}) => ({
  x: 60, y: 60, width: 400, height: 120,
  rotation: 0, opacity: 1, flipX: false, flipY: false,
  ...over,
});

describe("determinism", () => {
  // These two guard the finding that cost the most to uncover: resvg loads
  // fonts ONLY from filesystem paths, and passing it an unrecognised option
  // key makes it silently discard the whole font config and fall back to
  // `loadSystemFonts: true`. That produced perfect output on a Windows laptop
  // and would have produced tofu in a Linux container — a host-dependent
  // failure invisible to every other test in this file.

  const textSvg = (family: string) =>
    `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="600" height="120" viewBox="0 0 600 120">` +
    `<rect width="600" height="120" fill="#fff"/>` +
    `<text x="20" y="80" font-family="${family}" font-size="56" fill="#111">Hamburgefonstiv</text></svg>`;

  it.runIf(hasFont)("does NOT fall back to host-installed fonts", () => {
    // "Arial" is installed on this machine. Supplying no fonts must still
    // produce blank output — if this ever renders glyphs, the host's font book
    // has leaked into our render pipeline and output is no longer reproducible.
    const withoutFonts = rasterize(textSvg("Arial"), {});
    const withFonts = rasterize(textSvg("Arial"), { fontPaths: [SYSTEM_FONT] });

    expect(withoutFonts.byteLength).toBeLessThan(withFonts.byteLength / 2);
  });

  it.runIf(hasFont)("renders glyphs when the font is supplied by path", () => {
    const png = rasterize(textSvg("Arial"), { fontPaths: [SYSTEM_FONT] });
    expect(isPng(png)).toBe(true);
    expect(png.byteLength).toBeGreaterThan(3000);
  });
});

describe("rasterize", () => {
  it("produces a real PNG at the canvas size", async () => {
    const { png } = await renderToPng(emptyDocument());
    expect(isPng(png)).toBe(true);
    expect(pngSize(png)).toEqual({ width: 1012, height: 638 });
  });

  it.runIf(hasFont)("paints text using a supplied custom font (the v1 bug)", async () => {
    const base = emptyDocument();
    const document: CardDocument = {
      ...base,
      // Registered as a `custom` font with an id the loader resolves — exactly
      // the shape an uploaded .ttf takes.
      fonts: [
        { family: "Arial", weight: 400, style: "normal", source: { kind: "custom", fontId: "font-0" } },
      ],
      sides: [
        {
          ...base.sides[0],
          background: { kind: "color", color: "#FFFFFF" },
          children: [
            {
              id: newId(), name: "Name", locked: false, hidden: false, shadow: null,
              type: "text",
              content: { source: "static", value: "Jane Doe" },
              stroke: null,
              transform: transform(),
              typography: {
                fontFamily: "Arial", fontWeight: 400, fontStyle: "normal",
                fontSize: 72, lineHeight: 1.2, letterSpacing: 0,
                textAlign: "left", verticalAlign: "top", textTransform: "none",
                underline: false, color: "#111111",
                autoFit: "wrap", minFontSize: 8, maxLines: null,
              },
            },
          ],
        },
      ],
    };

    const { png, warnings } = await renderToPng(document, [SYSTEM_FONT]);

    // The font resolved, so there must be NO font-missing warning. In v1 this
    // path silently substituted and reported nothing at all.
    expect(warnings.filter((w) => w.kind === "font-missing")).toEqual([]);
    expect(isPng(png)).toBe(true);
    expect(looksPainted(png)).toBe(true);

    save("custom-font.png", png);
  });

  it("still produces output when a font is missing, and says so", async () => {
    const base = emptyDocument();
    const document: CardDocument = {
      ...base,
      fonts: [
        { family: "Ghost", weight: 400, style: "normal", source: { kind: "custom", fontId: "nope" } },
      ],
      sides: [
        {
          ...base.sides[0],
          children: [
            {
              id: newId(), name: "Name", locked: false, hidden: false, shadow: null,
              type: "text",
              content: { source: "static", value: "Jane Doe" },
              stroke: null,
              transform: transform(),
              typography: {
                fontFamily: "Ghost", fontWeight: 400, fontStyle: "normal",
                fontSize: 48, lineHeight: 1.2, letterSpacing: 0,
                textAlign: "left", verticalAlign: "top", textTransform: "none",
                underline: false, color: "#111111",
                autoFit: "wrap", minFontSize: 8, maxLines: null,
              },
            },
          ],
        },
      ],
    };

    const { png, warnings } = await renderToPng(document);

    // Degrades VISIBLY: output still exists, and the job records why it is
    // imperfect. This is the whole point of RenderWarning.
    expect(isPng(png)).toBe(true);
    expect(warnings).toContainEqual(expect.objectContaining({ kind: "font-missing", family: "Ghost" }));
  });

  it.runIf(hasFont)("renders a realistic ID card with every node type", async () => {
    const base = emptyDocument();
    const sideId = base.sides[0].id;

    const document: CardDocument = {
      ...base,
      fonts: [
        { family: "Arial", weight: 400, style: "normal", source: { kind: "custom", fontId: "font-0" } },
      ],
      sides: [
        {
          id: sideId,
          name: "Front",
          background: { kind: "color", color: "#FFFFFF" },
          children: [
            // Header bar
            {
              id: newId(), name: "Header", locked: false, hidden: false, shadow: null,
              type: "shape",
              shape: { kind: "rect", cornerRadius: 0 },
              fill: "#DC2626",
              stroke: null,
              transform: { x: 0, y: 0, width: 1012, height: 110, rotation: 0, opacity: 1, flipX: false, flipY: false },
            },
            // Org name in the header
            {
              id: newId(), name: "Org", locked: false, hidden: false, shadow: null,
              type: "text",
              content: { source: "static", value: "DEXFORGE INSTITUTE" },
              stroke: null,
              transform: { x: 40, y: 28, width: 700, height: 60, rotation: 0, opacity: 1, flipX: false, flipY: false },
              typography: {
                fontFamily: "Arial", fontWeight: 400, fontStyle: "normal",
                fontSize: 44, lineHeight: 1.2, letterSpacing: 2,
                textAlign: "left", verticalAlign: "middle", textTransform: "uppercase",
                underline: false, color: "#FFFFFF",
                autoFit: "shrink", minFontSize: 12, maxLines: 1,
              },
            },
            // Photo frame (circular) — no asset, so it warns and skips in raster
            {
              id: newId(), name: "Photo frame", locked: false, hidden: false, shadow: null,
              type: "shape",
              shape: { kind: "ellipse" },
              fill: "#E5E7EB",
              stroke: { color: "#DC2626", width: 6, align: "center" },
              transform: { x: 60, y: 170, width: 260, height: 260, rotation: 0, opacity: 1, flipX: false, flipY: false },
            },
            // Name
            {
              id: newId(), name: "Full name", locked: false, hidden: false, shadow: null,
              type: "text",
              content: { source: "column", column: "full_name", fallback: "" },
              stroke: null,
              transform: { x: 370, y: 190, width: 580, height: 90, rotation: 0, opacity: 1, flipX: false, flipY: false },
              typography: {
                fontFamily: "Arial", fontWeight: 400, fontStyle: "normal",
                fontSize: 56, lineHeight: 1.15, letterSpacing: 0,
                textAlign: "left", verticalAlign: "top", textTransform: "none",
                underline: false, color: "#111111",
                autoFit: "shrink-and-wrap", minFontSize: 24, maxLines: 2,
              },
            },
            // Role
            {
              id: newId(), name: "Role", locked: false, hidden: false, shadow: null,
              type: "text",
              content: { source: "template", pattern: "{{role}} · {{dept}}", fallback: "Staff" },
              stroke: null,
              transform: { x: 370, y: 290, width: 580, height: 50, rotation: 0, opacity: 1, flipX: false, flipY: false },
              typography: {
                fontFamily: "Arial", fontWeight: 400, fontStyle: "normal",
                fontSize: 30, lineHeight: 1.2, letterSpacing: 0,
                textAlign: "left", verticalAlign: "top", textTransform: "none",
                underline: false, color: "#71717A",
                autoFit: "shrink", minFontSize: 16, maxLines: 1,
              },
            },
            // QR
            {
              id: newId(), name: "QR", locked: false, hidden: false, shadow: null,
              type: "code",
              symbology: "qr",
              value: { source: "template", pattern: "{{card_id}}", fallback: "EMP0000" },
              foreground: "#111111", background: null,
              errorCorrection: "M", quietZone: 1,
              transform: { x: 790, y: 380, width: 170, height: 170, rotation: 0, opacity: 1, flipX: false, flipY: false },
            },
            // Rotated "SAMPLE" watermark — the case v1's renderer silently dropped
            {
              id: newId(), name: "Watermark", locked: false, hidden: false, shadow: null,
              type: "text",
              content: { source: "static", value: "SAMPLE" },
              stroke: null,
              transform: { x: 330, y: 420, width: 420, height: 100, rotation: -12, opacity: 0.18, flipX: false, flipY: false },
              typography: {
                fontFamily: "Arial", fontWeight: 400, fontStyle: "normal",
                fontSize: 76, lineHeight: 1.2, letterSpacing: 8,
                textAlign: "center", verticalAlign: "middle", textTransform: "uppercase",
                underline: false, color: "#DC2626",
                autoFit: "none", minFontSize: 8, maxLines: 1,
              },
            },
          ],
        },
      ],
    };

    // Render WITH a row, so bindings resolve to real values.
    const fontBytes = new Uint8Array(readFileSync(SYSTEM_FONT));
    const resolver = await createServerResolver(document.fonts, {
      loadAsset: async () => null,
      loadFont: async () => fontBytes,
    });

    const { ir, warnings } = await buildDocumentIR(document, {
      sideId,
      row: {
        card_id: "EMP-2026-0042",
        full_name: "Bartholomew Featherstonehaugh",
        role: "Lead Engineer",
        dept: "Platform",
      },
      resolver,
      mode: "raster",
    });

    const svg = serializeDocument(ir);
    const png = rasterize(svg, { fontPaths: resolver.fontPaths() });

    expect(isPng(png)).toBe(true);
    expect(pngSize(png)).toEqual({ width: 1012, height: 638 });
    expect(looksPainted(png)).toBe(true);

    // Rotation reached the output.
    expect(svg).toContain("rotate(-12");
    // The long name shrank rather than overflowing.
    expect(warnings.filter((w) => w.kind === "text-overflow")).toEqual([]);
    // No font problems, because the font was actually supplied.
    expect(warnings.filter((w) => w.kind === "font-missing")).toEqual([]);

    // Fonts must NOT be inlined for rasterization — resvg gets buffers. A card
    // SVG carrying a base64 font ballooned from ~14 KB to 1.4 MB, which across
    // a 2,000-card batch is gigabytes of wasted string building.
    expect(svg).not.toContain("@font-face");
    expect(svg.length).toBeLessThan(100_000);

    save("id-card.png", png);
    if (shouldWrite) {
      mkdirSync(ARTIFACTS, { recursive: true });
      writeFileSync(join(ARTIFACTS, "id-card.svg"), svg);
    }
  });
});
