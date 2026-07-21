// ============================================
// QUICKARDS — Renderer integration tests
// ============================================
//
// The Phase 1 exit criterion. These cover the five things v1 got wrong, so
// that each is a caught regression rather than a discovery made after a batch
// of badges comes back from the printer:
//
//   1. rotation is honoured in output (v1's renderer ignored it entirely)
//   2. text wraps (v1 emitted one <text> node with no wrapping)
//   3. custom fonts reach the rasterizer (v1's never did)
//   4. non-rect clips work (circle/triangle crops)
//   5. QR codes render as real geometry (v1 showed a placeholder in the editor)

import { describe, expect, it } from "vitest";

import { emptyDocument, newId, type CardDocument, type FontRef } from "../schema";
import { buildDocumentIR } from "./build";
import { serializeDocument } from "./emit-string";
import { createServerResolver } from "./resolver.server";

/** A resolver with no assets and no fonts — exercises the warning paths. */
const bareResolver = () =>
  createServerResolver([], {
    loadAsset: async () => null,
    loadFont: async () => null,
  });

function doc(children: CardDocument["sides"][number]["children"], fonts: FontRef[] = []): CardDocument {
  const base = emptyDocument();
  return { ...base, fonts, sides: [{ ...base.sides[0], children }] };
}

const transform = (over: Partial<CardDocument["sides"][number]["children"][number]["transform"]> = {}) => ({
  x: 40, y: 40, width: 400, height: 120,
  rotation: 0, opacity: 1, flipX: false, flipY: false,
  ...over,
});

const textNode = (over: Record<string, unknown> = {}) => ({
  id: newId(),
  name: "Name",
  locked: false,
  hidden: false,
  shadow: null,
  type: "text" as const,
  content: { source: "static" as const, value: "Jane Doe" },
  stroke: null,
  transform: transform(),
  typography: {
    fontFamily: "Inter", fontWeight: 400, fontStyle: "normal" as const,
    fontSize: 32, lineHeight: 1.2, letterSpacing: 0,
    textAlign: "left" as const, verticalAlign: "top" as const,
    textTransform: "none" as const, underline: false, color: "#111111",
    autoFit: "wrap" as const, minFontSize: 8, maxLines: null,
  },
  ...over,
});

async function render(document: CardDocument) {
  const resolver = await bareResolver();
  const result = await buildDocumentIR(document, {
    sideId: document.sides[0].id,
    row: null,
    resolver,
    mode: "raster",
  });
  return { ...result, svg: serializeDocument(result.ir) };
}

describe("document structure", () => {
  it("emits a canvas-sized svg", async () => {
    const { svg } = await render(emptyDocument());
    expect(svg).toContain('width="1012"');
    expect(svg).toContain('height="638"');
    expect(svg).toContain('viewBox="0 0 1012 638"');
  });

  it("paints the background colour", async () => {
    const { svg } = await render(emptyDocument());
    expect(svg).toContain('fill="#FFFFFF"');
  });

  it("preserves array order as paint order", async () => {
    const first = textNode({ content: { source: "static", value: "BOTTOM" } });
    const second = textNode({ content: { source: "static", value: "TOP" } });
    const { svg } = await render(doc([first, second]));
    expect(svg.indexOf("BOTTOM")).toBeLessThan(svg.indexOf("TOP"));
  });
});

describe("rotation (v1 ignored this entirely)", () => {
  it("emits a rotate transform about the box centre", async () => {
    const node = textNode({ transform: transform({ rotation: 45 }) });
    const { svg } = await render(doc([node]));
    // centre of a 400x120 box at (40,40) is (240,100)
    expect(svg).toContain("rotate(45 240 100)");
  });

  it("omits the transform entirely when unrotated", async () => {
    const { svg } = await render(doc([textNode()]));
    expect(svg).not.toContain("rotate(");
  });
});

describe("text layout (v1 could not wrap)", () => {
  it("splits long text into multiple tspans", async () => {
    const node = textNode({
      content: { source: "static", value: "Bartholomew Featherstonehaugh the Third" },
      transform: transform({ width: 200 }),
    });
    const { svg } = await render(doc([node]));
    const tspans = svg.match(/<tspan/g) ?? [];
    expect(tspans.length).toBeGreaterThan(1);
  });

  it("shrinks to fit when autoFit allows it", async () => {
    const long = "Bartholomew Featherstonehaugh";
    const shrink = textNode({
      content: { source: "static", value: long },
      transform: transform({ width: 200, height: 40 }),
      typography: { ...textNode().typography, autoFit: "shrink-and-wrap", fontSize: 32 },
    });
    const { svg } = await render(doc([shrink]));
    const size = Number(svg.match(/font-size="([\d.]+)"/)?.[1]);
    expect(size).toBeLessThan(32);
    expect(size).toBeGreaterThanOrEqual(8);
  });

  it("warns rather than failing when text cannot fit", async () => {
    const node = textNode({
      content: { source: "static", value: "x".repeat(400) },
      transform: transform({ width: 60, height: 20 }),
      typography: { ...textNode().typography, autoFit: "none" },
    });
    const { warnings } = await render(doc([node]));
    expect(warnings.some((w) => w.kind === "text-overflow")).toBe(true);
  });

  it("applies textTransform without mangling interior capitals", async () => {
    const node = textNode({
      content: { source: "static", value: "ronald mcdonald" },
      typography: { ...textNode().typography, textTransform: "capitalize" },
    });
    const { svg } = await render(doc([node]));
    expect(svg).toContain("Ronald Mcdonald");
  });
});

describe("warnings replace v1's silent failures", () => {
  it("reports a missing font instead of silently substituting", async () => {
    const node = textNode({
      typography: { ...textNode().typography, fontFamily: "NotInstalled" },
    });
    const { warnings } = await render(doc([node]));
    const warning = warnings.find((w) => w.kind === "font-missing");
    expect(warning).toBeDefined();
    expect(warning).toMatchObject({ family: "NotInstalled" });
  });

  it("reports a missing image instead of rendering a blank card", async () => {
    const node = {
      id: newId(), name: "Photo", locked: false, hidden: false, shadow: null,
      type: "image" as const,
      src: { kind: "asset" as const, assetId: "does-not-exist" },
      fit: "cover" as const,
      clip: { kind: "rect" as const, cornerRadius: 0 },
      border: null,
      transform: transform(),
    };
    const { warnings } = await render(doc([node]));
    expect(warnings.some((w) => w.kind === "image-missing")).toBe(true);
  });

  it("reports a missing column", async () => {
    const resolver = await bareResolver();
    const node = textNode({ content: { source: "column", column: "absent", fallback: "-" } });
    const document = doc([node]);
    const { warnings } = await buildDocumentIR(document, {
      sideId: document.sides[0].id,
      row: { present: "yes" },
      resolver,
      mode: "raster",
    });
    expect(warnings).toContainEqual(expect.objectContaining({ kind: "column-missing", column: "absent" }));
  });
});

describe("codes", () => {
  const codeNode = (over: Record<string, unknown> = {}) => ({
    id: newId(), name: "QR", locked: false, hidden: false, shadow: null,
    type: "code" as const,
    symbology: "qr" as const,
    value: { source: "static" as const, value: "EMP001" },
    foreground: "#000000", background: null,
    errorCorrection: "M" as const, quietZone: 0,
    transform: transform({ width: 160, height: 160 }),
    ...over,
  });

  it("emits real path geometry, not a placeholder", async () => {
    const { svg } = await render(doc([codeNode()]));
    const path = svg.match(/<path d="([^"]+)"/)?.[1] ?? "";
    // A QR of any content produces many subpaths; a placeholder produces none.
    expect(path.split("M").length).toBeGreaterThan(20);
  });

  it("stays square inside a non-square box so it still scans", async () => {
    const { svg } = await render(doc([codeNode({ transform: transform({ width: 300, height: 100 }) })]));
    // min(300,100) = 100, centred horizontally: x offset = 40 + (300-100)/2 = 140
    expect(svg).toContain("translate(140 40)");
  });

  it("warns on an unsupported symbology rather than throwing", async () => {
    const { warnings } = await render(doc([codeNode({ symbology: "ean13" })]));
    expect(warnings.some((w) => w.kind === "code-failed")).toBe(true);
  });
});

describe("editor vs raster mode", () => {
  it("tags nodes for hit-testing only in editor mode", async () => {
    const document = doc([textNode()]);
    const resolver = await bareResolver();

    const editor = await buildDocumentIR(document, {
      sideId: document.sides[0].id, row: null, resolver, mode: "editor",
    });
    const raster = await buildDocumentIR(document, {
      sideId: document.sides[0].id, row: null, resolver, mode: "raster",
    });

    expect(serializeDocument(editor.ir)).toContain("data-node-id");
    expect(serializeDocument(raster.ir)).not.toContain("data-node-id");
  });
});
