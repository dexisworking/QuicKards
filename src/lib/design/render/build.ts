// ============================================
// QUICKARDS — buildDocumentIR
// ============================================
//
// THE single implementation of card layout. Everything that decides where a
// pixel goes happens here: geometry, rotation, text wrapping, autoFit, clip
// paths, binding resolution, image fitting, code generation.
//
// The two emitters (`emit-string.ts` for resvg, `emit-react.tsx` for the
// editor) consume the SvgIR this produces and compute nothing. That asymmetry
// is the entire architecture — v1's editor and renderer were peers, each
// deciding layout for itself, and they drifted apart in four separate ways
// before anyone noticed.
//
// Isomorphic. Environment-specific work (fetching image bytes, loading font
// files) is behind the ResourceResolver interface.

import { resolveText, type RenderRow } from "../bindings";
import { generateCode } from "../codes/generate";
import { clipPathData, fitRect, round, transformAttr, type Rect } from "../geometry";
import { blockOffsetY, layoutText, lineOffsetX } from "../text/layout";
import { fallbackMetrics } from "../text/metrics";
import type {
  CardDocument,
  CodeNode,
  DesignNode,
  ImageNode,
  ShapeNode,
  SideBackground,
  TextNode,
} from "../schema";
import { el, textEl, type BuildResult, type RenderWarning, type SvgIR } from "./ir";
import type { ResourceResolver } from "./resolver";

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

export type BuildMode = "editor" | "raster";

export type BuildOptions = {
  /** Which side to render. Sides are independent documents sharing a canvas. */
  sideId: string;
  /** The CSV row being merged, or null at design time. */
  row: RenderRow;
  resolver: ResourceResolver;
  /**
   * "editor" tags nodes with `data-node-id` for hit-testing and leaves remote
   * image hrefs alone for the browser to fetch.
   *
   * "raster" inlines every byte, because resvg fetches nothing — no network,
   * no filesystem, no system fonts. An unresolved resource in raster mode does
   * not error, it renders as nothing, which is why every miss emits a warning.
   */
  mode: BuildMode;
};

type Ctx = BuildOptions & {
  warnings: RenderWarning[];
  /** <clipPath>/<filter> definitions accumulated during the walk, hoisted into
   *  a single <defs> at the end. Collecting them as we go keeps clip creation
   *  next to the node that needs it rather than in a separate pre-pass that
   *  would have to re-derive the same geometry. */
  defs: SvgIR[];
};

export async function buildDocumentIR(
  doc: CardDocument,
  opts: BuildOptions,
): Promise<BuildResult> {
  const side = doc.sides.find((s) => s.id === opts.sideId) ?? doc.sides[0];
  const { width, height } = doc.canvas;

  const ctx: Ctx = { ...opts, warnings: [], defs: [] };

  const body: SvgIR[] = [];

  const background = await buildBackground(side.background, doc, ctx);
  if (background) body.push(background);

  for (const node of side.children) {
    const rendered = await buildNode(node, ctx);
    if (rendered) body.push(rendered);
  }

  // Font faces must be inlined for raster mode; the client resolver returns []
  // because the browser already has the faces registered and re-declaring them
  // on every render would thrash the font cache.
  const faceRules = ctx.resolver.fontFaceRules(doc.fonts);
  if (faceRules.length > 0) {
    ctx.defs.unshift(textEl("style", { type: "text/css" }, faceRules.join("\n")));
  }

  const children: SvgIR[] = [];
  if (ctx.defs.length > 0) children.push(el("defs", {}, ctx.defs));
  children.push(...body);

  const ir = el(
    "svg",
    {
      xmlns: SVG_NS,
      "xmlns:xlink": XLINK_NS,
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      // Without this, a viewer that sizes the SVG differently letterboxes it.
      // Card output must fill its box exactly or the print geometry is wrong.
      preserveAspectRatio: "none",
    },
    children,
  );

  return { ir, warnings: ctx.warnings };
}

// ── Background ──────────────────────────────────────────────────────────────

async function buildBackground(
  background: SideBackground,
  doc: CardDocument,
  ctx: Ctx,
): Promise<SvgIR | null> {
  const box: Rect = { x: 0, y: 0, width: doc.canvas.width, height: doc.canvas.height };

  if (background.kind === "none") return null;

  if (background.kind === "color") {
    return el("rect", { x: 0, y: 0, width: box.width, height: box.height, fill: background.color });
  }

  const image = await ctx.resolver.resolveImage(background.src, ctx.row);
  if (!image) {
    ctx.warnings.push({
      kind: "image-missing",
      nodeId: "__background__",
      source: describeImageSource(background.src),
    });
    return null;
  }

  const rect = fitRect({ width: image.width, height: image.height }, box, background.fit);
  const clipId = "clip-background";
  ctx.defs.push(
    el("clipPath", { id: clipId }, [el("path", { d: clipPathData({ kind: "rect", cornerRadius: 0 }, box) })]),
  );

  return el("image", {
    href: image.href,
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
    preserveAspectRatio: "none",
    "clip-path": `url(#${clipId})`,
  });
}

// ── Node dispatch ───────────────────────────────────────────────────────────

async function buildNode(node: DesignNode, ctx: Ctx): Promise<SvgIR | null> {
  if (node.hidden) return null;

  let inner: SvgIR | null = null;

  switch (node.type) {
    case "text":
      inner = buildText(node, ctx);
      break;
    case "image":
      inner = await buildImage(node, ctx);
      break;
    case "shape":
      inner = buildShape(node);
      break;
    case "code":
      inner = buildCode(node, ctx);
      break;
    case "group": {
      const children: SvgIR[] = [];
      for (const child of node.children) {
        const rendered = await buildNode(child, ctx);
        if (rendered) children.push(rendered);
      }
      inner = children.length > 0 ? el("g", {}, children) : null;
      break;
    }
  }

  if (!inner) return null;
  return wrap(node, inner, ctx);
}

/**
 * Apply the node-level concerns every type shares: transform, opacity, drop
 * shadow, and the editor's hit-testing hook.
 *
 * Wrapping only when something is actually non-default keeps the emitted tree
 * shallow — which matters in the editor, where every extra <g> is another node
 * the browser lays out on each of the sixty re-renders a drag produces.
 */
function wrap(node: DesignNode, inner: SvgIR, ctx: Ctx): SvgIR {
  const attrs: Record<string, string | number> = {};

  const transform = transformAttr(node.transform);
  if (transform) attrs.transform = transform;
  if (node.transform.opacity < 1) attrs.opacity = round(node.transform.opacity);

  if (node.shadow) {
    // NOTE: feDropShadow is the readable choice, but resvg's filter support is
    // partial and can diverge from browsers. The Phase 1 golden-image test
    // covers exactly this case; if it fails, swap this for a duplicated offset
    // copy of the node painted underneath — deterministic, faster, and
    // identical on both sides. Localised here on purpose.
    const filterId = `shadow-${node.id}`;
    ctx.defs.push(
      el("filter", { id: filterId, x: "-50%", y: "-50%", width: "200%", height: "200%" }, [
        el("feDropShadow", {
          dx: round(node.shadow.offsetX),
          dy: round(node.shadow.offsetY),
          stdDeviation: round(node.shadow.blur / 2), // stdDeviation is ~half the visual blur radius
          "flood-color": node.shadow.color,
        }),
      ]),
    );
    attrs.filter = `url(#${filterId})`;
  }

  if (ctx.mode === "editor") {
    attrs["data-node-id"] = node.id;
    if (node.locked) attrs["data-locked"] = "true";
  }

  if (Object.keys(attrs).length === 0) return inner;
  return el("g", attrs, [inner]);
}

// ── Text ────────────────────────────────────────────────────────────────────

function buildText(node: TextNode, ctx: Ctx): SvgIR | null {
  const { value, missing } = resolveText(node.content, ctx.row);

  for (const column of missing) {
    ctx.warnings.push({ kind: "column-missing", nodeId: node.id, column });
  }

  if (value.length === 0) return null;

  const typography = node.typography;
  let metrics = ctx.resolver.resolveFont(
    typography.fontFamily,
    typography.fontWeight,
    typography.fontStyle,
  );

  if (!metrics) {
    ctx.warnings.push({
      kind: "font-missing",
      family: typography.fontFamily,
      weight: typography.fontWeight,
      nodeId: node.id,
    });
    metrics = fallbackMetrics;
  }

  const box = node.transform;
  const layout = layoutText(value, { width: box.width, height: box.height }, typography, metrics);

  if (layout.overflowed) {
    ctx.warnings.push({
      kind: "text-overflow",
      nodeId: node.id,
      lines: layout.lines.length,
      maxLines: typography.maxLines ?? 0,
    });
  }

  const originY = box.y + blockOffsetY(layout, box.height, typography.verticalAlign);

  const attrs: Record<string, string | number> = {
    "font-family": quoteFamily(typography.fontFamily),
    "font-size": round(layout.fontSize),
    "font-weight": typography.fontWeight,
    fill: typography.color,
  };
  if (typography.fontStyle !== "normal") attrs["font-style"] = typography.fontStyle;
  if (typography.letterSpacing !== 0) attrs["letter-spacing"] = round(typography.letterSpacing);
  if (typography.underline) attrs["text-decoration"] = "underline";

  if (node.stroke && node.stroke.width > 0) {
    attrs.stroke = node.stroke.color;
    attrs["stroke-width"] = round(node.stroke.width);
    // Without this the stroke is centred on the glyph outline and eats into
    // the letterform, which reads as a bolder, muddier weight.
    attrs["paint-order"] = "stroke fill";
  }

  // One <tspan> per line with an absolute x/y. Relative `dy` positioning is the
  // common alternative and it breaks under `text-anchor` changes and empty
  // lines — absolute coordinates are computed once, here, and cannot drift.
  const spans = layout.lines.map((line) =>
    textEl(
      "tspan",
      {
        x: round(box.x + lineOffsetX(line, box.width, typography.textAlign)),
        y: round(originY + line.baseline),
        // Preserve authored runs of spaces; xml:space is the only reliable way
        // and both resvg and browsers honour it.
        "xml:space": "preserve",
      },
      line.text,
    ),
  );

  return el("text", attrs, spans);
}

/** Families containing spaces need quoting in the SVG font-family attribute,
 *  or `Noto Sans` parses as two candidate families named `Noto` and `Sans`. */
function quoteFamily(family: string): string {
  return /[\s,]/.test(family) ? `'${family.replaceAll("'", "")}'` : family;
}

// ── Image ───────────────────────────────────────────────────────────────────

async function buildImage(node: ImageNode, ctx: Ctx): Promise<SvgIR | null> {
  const resolved = await ctx.resolver.resolveImage(node.src, ctx.row);

  if (!resolved) {
    ctx.warnings.push({
      kind: "image-missing",
      nodeId: node.id,
      source: describeImageSource(node.src),
    });
    // In the editor, an unresolved image shows a placeholder so the layout is
    // still editable. In raster mode it renders nothing — a grey box printed
    // on 200 badges is worse than a gap plus a warning.
    return ctx.mode === "editor" ? placeholderRect(node.transform) : null;
  }

  const box: Rect = node.transform;
  const rect = fitRect({ width: resolved.width, height: resolved.height }, box, node.fit);

  const clipId = `clip-${node.id}`;
  ctx.defs.push(el("clipPath", { id: clipId }, [el("path", { d: clipPathData(node.clip, box) })]));

  const image = el("image", {
    href: resolved.href,
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
    // We computed cover/contain ourselves in fitRect, so the renderer must not
    // apply its own fitting on top of it.
    preserveAspectRatio: "none",
    "clip-path": `url(#${clipId})`,
  });

  if (!node.border || node.border.width <= 0) return image;

  // The border traces the clip outline, not the node box, so a circular crop
  // gets a circular border. v1 drew a rect border over a masked image, which
  // looked wrong for every non-rect shape.
  const border = el("path", {
    d: clipPathData(node.clip, box),
    fill: "none",
    stroke: node.border.color,
    "stroke-width": round(node.border.width),
  });

  return el("g", {}, [image, border]);
}

function placeholderRect(box: Rect): SvgIR {
  return el("rect", {
    x: round(box.x),
    y: round(box.y),
    width: round(box.width),
    height: round(box.height),
    fill: "#F3F4F6",
    stroke: "#9CA3AF",
    "stroke-width": 2,
    "stroke-dasharray": "6 4",
  });
}

// ── Shape ───────────────────────────────────────────────────────────────────

function buildShape(node: ShapeNode): SvgIR {
  const attrs: Record<string, string | number> = {
    d: clipPathData(node.shape, node.transform),
    fill: node.fill ?? "none",
  };

  if (node.stroke && node.stroke.width > 0) {
    attrs.stroke = node.stroke.color;
    attrs["stroke-width"] = round(node.stroke.width);
  }

  return el("path", attrs);
}

// ── Code ────────────────────────────────────────────────────────────────────

function buildCode(node: CodeNode, ctx: Ctx): SvgIR | null {
  const { value, missing } = resolveText(node.value, ctx.row);

  for (const column of missing) {
    ctx.warnings.push({ kind: "column-missing", nodeId: node.id, column });
  }

  const box = node.transform;
  // Codes must stay square or they will not scan. Use the smaller dimension
  // and centre within the box rather than distorting to fill it.
  const size = Math.min(box.width, box.height);
  const offsetX = box.x + (box.width - size) / 2;
  const offsetY = box.y + (box.height - size) / 2;

  const result = generateCode(node, value, size);

  if (!result.ok) {
    ctx.warnings.push({
      kind: "code-failed",
      nodeId: node.id,
      symbology: node.symbology,
      reason: result.reason,
    });
    return ctx.mode === "editor" ? placeholderRect(box) : null;
  }

  // Both children are in the code's own 0..size coordinate space; the wrapping
  // <g> below carries the offset. Using absolute coordinates here as well
  // would apply the translation twice.
  const children: SvgIR[] = [];

  if (node.background) {
    children.push(
      el("rect", { x: 0, y: 0, width: round(size), height: round(size), fill: node.background }),
    );
  }

  children.push(el("path", { d: result.path, fill: node.foreground }));

  return el("g", { transform: `translate(${round(offsetX)} ${round(offsetY)})` }, children);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function describeImageSource(src: ImageNode["src"]): string {
  switch (src.kind) {
    case "asset":
      return `asset:${src.assetId}`;
    case "url":
      return src.url;
    case "column":
      return `column:${src.column}`;
  }
}
