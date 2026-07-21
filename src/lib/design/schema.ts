// ============================================
// QUICKARDS — Canonical card document schema v2
// ============================================
//
// This module is the single source of truth for what a card design IS. The
// editor store, the SVG renderer, the `design_versions.document` jsonb column
// and the v1 migrator all bind to these types.
//
// It must stay isomorphic — no `node:` imports, no DOM globals. It is imported
// by client components, route handlers and the Inngest render function alike.
//
// Two invariants everything downstream relies on:
//
//   1. `id` is minted once and NEVER regenerated. v1 recomputed ids from the
//      array index on every save (`normalize.ts:33` — `field-${index + 1}`),
//      which made stable references impossible: selection, undo history and
//      per-node overrides all broke the moment a node was reordered.
//
//   2. Array order IS paint order. `children[0]` paints first (bottom). There
//      is deliberately no `zIndex` field — a single ordered array cannot
//      disagree with itself the way an array plus an index number can.

import { z } from "zod";

import { newId } from "./id";

/** Re-exported so callers minting nodes don't need to reach past this module. */
export { newId };

export const SCHEMA_VERSION = 2 as const;

const Id = z.string().min(1);

/** #rgb, #rgba, #rrggbb, #rrggbbaa. Alpha forms exist because SVG needs a
 *  separate fill-opacity attribute otherwise, and round-tripping that through
 *  the properties panel is more surface area than it is worth. */
const Hex = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Expected a hex colour");

// ── Bindings ────────────────────────────────────────────────────────────────
//
// The fix for v1's `fieldName` conflation. In v1 one string was simultaneously
// the on-canvas display text, the CSV column key and the human label
// (`src/lib/types.ts:10`). That made static text impossible to express, made
// renaming a column destructive, and made two elements bound to the same
// column indistinguishable in a layers list.
//
// `template` technically subsumes `column`, but both exist because the binding
// UI is far simpler when the common single-column case has its own shape — a
// dropdown rather than a text field the user can typo into.

const StaticBinding = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ source: z.literal("static"), value });

const ColumnBinding = z.object({
  source: z.literal("column"),
  /** Matched against CSV headers by `lookupColumn` — exact first, then the
   *  normalised fuzzy match preserved from v1. See `./bindings.ts`. */
  column: z.string().min(1),
  fallback: z.string().default(""),
});

const TemplateBinding = z.object({
  source: z.literal("template"),
  /** e.g. "{{first_name}} {{last_name}}" or "ID: {{card_id}}" */
  pattern: z.string(),
  fallback: z.string().default(""),
});

export const TextBinding = z.discriminatedUnion("source", [
  StaticBinding(z.string()),
  ColumnBinding,
  TemplateBinding,
]);
export type TextBinding = z.infer<typeof TextBinding>;

/** Images resolve differently on client (blob:/https: href) and server
 *  (inlined data: URI, because resvg performs no I/O). The document only names
 *  the source; resolution is the ResourceResolver's job. */
export const ImageSource = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("asset"), assetId: Id }),
  z.object({ kind: z.literal("url"), url: z.string().url() }),
  z.object({
    kind: z.literal("column"),
    column: z.string().min(1),
    fallbackAssetId: Id.nullable().default(null),
  }),
]);
export type ImageSource = z.infer<typeof ImageSource>;

// ── Shared value objects ────────────────────────────────────────────────────

export const Transform = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  /** Degrees, clockwise, about the box centre. v1 stored this and the renderer
   *  ignored it outright — `engine.ts` never reads `field.rotation`, because
   *  sharp's composite() has no rotation parameter. Rotated elements were
   *  editable on canvas and came out unrotated in print. */
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  flipX: z.boolean().default(false),
  flipY: z.boolean().default(false),
});
export type Transform = z.infer<typeof Transform>;

export const Stroke = z.object({
  color: Hex,
  width: z.number().nonnegative(),
  align: z.enum(["inside", "center", "outside"]).default("center"),
});
export type Stroke = z.infer<typeof Stroke>;

export const Shadow = z.object({
  color: z.string(),
  blur: z.number().nonnegative(),
  offsetX: z.number(),
  offsetY: z.number(),
});
export type Shadow = z.infer<typeof Shadow>;

export const ClipShape = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("rect"), cornerRadius: z.number().nonnegative().default(0) }),
  z.object({ kind: z.literal("ellipse") }),
  z.object({
    kind: z.literal("polygon"),
    /** Normalised 0..1 within the node box, so a polygon survives resizing. */
    points: z.array(z.tuple([z.number(), z.number()])).min(3),
  }),
]);
export type ClipShape = z.infer<typeof ClipShape>;

export const Typography = z.object({
  fontFamily: z.string().default("Inter"),
  fontWeight: z.number().int().min(100).max(900).default(400),
  fontStyle: z.enum(["normal", "italic"]).default("normal"),
  fontSize: z.number().positive().default(24),
  /** A multiplier, not px — survives fontSize changes and autoFit shrinking
   *  without the caller having to recompute anything. */
  lineHeight: z.number().positive().default(1.2),
  letterSpacing: z.number().default(0),
  textAlign: z.enum(["left", "center", "right", "justify"]).default("left"),
  verticalAlign: z.enum(["top", "middle", "bottom"]).default("top"),
  textTransform: z.enum(["none", "uppercase", "lowercase", "capitalize"]).default("none"),
  underline: z.boolean().default(false),
  color: Hex.default("#111111"),
  /** The property that makes bulk merge survive real data.
   *
   *  A name box sized for "Jane Doe" meets "Bartholomew Featherstonehaugh" on
   *  row 400. Without autoFit that card is silently wrong and nobody notices
   *  until 800 badges come back from the printer. v1 had no equivalent — it
   *  emitted a single <text> node with no wrapping at all, so long values
   *  simply ran off the edge of the card. */
  autoFit: z.enum(["none", "shrink", "wrap", "shrink-and-wrap"]).default("wrap"),
  minFontSize: z.number().positive().default(8),
  maxLines: z.number().int().positive().nullable().default(null),
});
export type Typography = z.infer<typeof Typography>;

// ── Nodes ───────────────────────────────────────────────────────────────────

const BaseNode = z.object({
  id: Id,
  /** Human label for the layers panel only. NEVER a binding key — that is what
   *  `content`/`src`/`value` are for. This separation is the whole point. */
  name: z.string().default(""),
  locked: z.boolean().default(false),
  hidden: z.boolean().default(false),
  transform: Transform,
  shadow: Shadow.nullable().default(null),
});

export const TextNode = BaseNode.extend({
  type: z.literal("text"),
  content: TextBinding,
  typography: Typography,
  stroke: Stroke.nullable().default(null),
});
export type TextNode = z.infer<typeof TextNode>;

export const ImageNode = BaseNode.extend({
  type: z.literal("image"),
  src: ImageSource,
  fit: z.enum(["cover", "contain", "fill"]).default("cover"),
  clip: ClipShape.default({ kind: "rect", cornerRadius: 0 }),
  border: Stroke.nullable().default(null),
});
export type ImageNode = z.infer<typeof ImageNode>;

export const ShapeNode = BaseNode.extend({
  type: z.literal("shape"),
  shape: ClipShape,
  fill: Hex.nullable().default("#E5E7EB"),
  stroke: Stroke.nullable().default(null),
});
export type ShapeNode = z.infer<typeof ShapeNode>;

export const CodeNode = BaseNode.extend({
  type: z.literal("code"),
  symbology: z
    .enum(["qr", "code128", "code39", "ean13", "pdf417", "datamatrix"])
    .default("qr"),
  value: TextBinding,
  foreground: Hex.default("#000000"),
  /** null renders transparent, which is what you want over a coloured card. */
  background: Hex.nullable().default(null),
  errorCorrection: z.enum(["L", "M", "Q", "H"]).default("M"),
  quietZone: z.number().int().nonnegative().default(0),
});
export type CodeNode = z.infer<typeof CodeNode>;

export type GroupNode = z.infer<typeof BaseNode> & {
  type: "group";
  children: DesignNode[];
};

/** Recursive: groups contain nodes, including other groups.
 *
 *  Nesting via `children` rather than a flat list with `parentId` means the
 *  renderer walks the tree and pushes one <g> per group, so group transforms
 *  compose for free. A flat list would need a topological sort on every single
 *  render, and would let a corrupt document express a cycle. */
export type DesignNode = TextNode | ImageNode | ShapeNode | CodeNode | GroupNode;

export const DesignNode: z.ZodType<DesignNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    TextNode,
    ImageNode,
    ShapeNode,
    CodeNode,
    BaseNode.extend({
      type: z.literal("group"),
      children: z.array(DesignNode),
    }),
  ]),
) as z.ZodType<DesignNode>;

// ── Sides & document ────────────────────────────────────────────────────────

export const SideBackground = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("color"), color: Hex }),
  z.object({
    kind: z.literal("image"),
    src: ImageSource,
    fit: z.enum(["cover", "contain", "fill"]).default("cover"),
  }),
]);
export type SideBackground = z.infer<typeof SideBackground>;

export const CardSide = z.object({
  id: Id,
  name: z.string().default("Front"),
  background: SideBackground.default({ kind: "color", color: "#FFFFFF" }),
  /** ARRAY ORDER IS Z-ORDER. children[0] paints first (bottom). */
  children: z.array(DesignNode).default([]),
});
export type CardSide = z.infer<typeof CardSide>;

export const Canvas = z.object({
  width: z.number().positive().default(1012), // CR80 @ 300 DPI
  height: z.number().positive().default(638),
  /** The authoring unit, for display in the properties panel. Geometry is
   *  ALWAYS stored in px — v1 converted at the UI boundary too, and mixing
   *  units inside the document is how rounding drift starts. */
  unit: z.enum(["px", "mm", "in"]).default("px"),
  dpi: z.number().positive().default(300),
  bleed: z.number().nonnegative().default(0),
  safeArea: z.number().nonnegative().default(0),
});
export type Canvas = z.infer<typeof Canvas>;

/** Fonts the document depends on.
 *
 *  Denormalised at document level deliberately. The renderer must know what to
 *  load WITHOUT walking every node first — font loading has to complete before
 *  first paint or text is measured against the wrong metrics (see the FOUT
 *  note in the plan). It also means a render pinned to an old design version
 *  resolves the fonts of its own era rather than today's. */
export const FontRef = z.object({
  family: z.string(),
  weight: z.number().int(),
  style: z.enum(["normal", "italic"]),
  source: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("builtin") }),
    z.object({ kind: z.literal("library"), fontId: Id }),
    z.object({ kind: z.literal("custom"), fontId: Id }),
  ]),
});
export type FontRef = z.infer<typeof FontRef>;

export const CardDocument = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  canvas: Canvas,
  /** 1 or 2 entries. Index 0 is always the front.
   *
   *  Capped at 2 on purpose. ID cards are front/back; an unbounded `pages`
   *  array invites scope creep into a general-purpose design tool. If
   *  multi-page ever matters, `.max(2)` is a one-character change — the shape
   *  does not need to anticipate it today. */
  sides: z.array(CardSide).min(1).max(2),
  fonts: z.array(FontRef).default([]),
  /** Document swatches, surfaced in every colour picker. */
  palette: z.array(Hex).default([]),
});
export type CardDocument = z.infer<typeof CardDocument>;

// ── Constructors ────────────────────────────────────────────────────────────

/** CR80 (the standard ID card, 3.375" x 2.125") at 300 DPI — the same default
 *  v1 used (`normalize.ts`), kept so migrated documents keep their proportions. */
export const CR80_300DPI = { width: 1012, height: 638 } as const;

export function emptyDocument(
  overrides: Partial<Pick<Canvas, "width" | "height" | "unit" | "dpi">> = {},
): CardDocument {
  return CardDocument.parse({
    schemaVersion: SCHEMA_VERSION,
    canvas: { ...CR80_300DPI, ...overrides },
    sides: [{ id: newId(), name: "Front", children: [] }],
    fonts: [],
    palette: [],
  });
}
