// ============================================
// QUICKARDS — v1 → v2 document migration
// ============================================
//
// Converts the flat `TemplateField[]` of v1 (`src/lib/types.ts`) into a v2
// CardDocument.
//
// The elegant part: EVERY v1 field was implicitly column-bound. v1 had no way
// to express static text — `fieldName` was simultaneously the display text and
// the CSV column key. So v1's conflation maps onto v2's binding with no
// ambiguity at all: `fieldName` becomes both the human `name` and the bound
// `column`, and from that moment on the two are independent and can be edited
// separately.
//
// Worth writing even though v1's 36-hour TTL (`src/lib/expiry.ts`) means the
// durable corpus is empty: it is cheap, it documents the old shape precisely,
// and it means an old export a user kept on disk is still importable.

import { newId } from "./id";
import {
  CardDocument,
  SCHEMA_VERSION,
  type CardSide,
  type ClipShape,
  type DesignNode,
  type Typography,
} from "./schema";

// Structural types for v1 input. Declared locally rather than imported from
// `@/lib/types` so this module survives that file being deleted.
type LegacyField = {
  id?: string;
  fieldType?: "text" | "image" | "qr";
  fieldName?: string;
  x?: number; y?: number; width?: number; height?: number;
  opacity?: number; rotation?: number;
  fontSize?: number; color?: string; align?: "left" | "center" | "right";
  fontFamily?: string; fontWeight?: "normal" | "bold"; fontStyle?: "normal" | "italic";
  underline?: boolean;
  strokeColor?: string; strokeWidth?: number;
  shadowColor?: string; shadowBlur?: number; shadowOffsetX?: number; shadowOffsetY?: number;
  fillColor?: string; borderColor?: string; borderWidth?: number;
  cornerRadius?: number; shape?: "rect" | "circle" | "triangle";
};

export type LegacyTemplateDocument = {
  width?: number;
  height?: number;
  unit?: "px" | "mm" | "in";
  fields?: LegacyField[];
  /** v1 stored the background separately on the template row, not in the
   *  document. Callers pass it through so the migrated side keeps it. */
};

export type MigrateOptions = {
  /** From `templates.backgroundFileId` — v1's TemplateRecord.background_url
   *  actually held a file id, not a URL (`records.ts:81`). */
  backgroundAssetId?: string | null;
  /** From `templates.backgroundExternalUrl`. */
  backgroundUrl?: string | null;
};

/** v1's defaults, from `src/lib/template/normalize.ts`. Reproduced exactly so
 *  a field that omitted a property migrates to what it actually rendered as,
 *  not to what v2 would have defaulted it to. */
const V1 = {
  width: 180,
  height: 50,
  fontSize: 24,
  color: "#111111",
  fontFamily: "Arial",
  fillColor: "#f3f4f6",
  borderColor: "#2563eb",
  borderWidth: 1,
} as const;

export function migrateV1(
  legacy: LegacyTemplateDocument,
  options: MigrateOptions = {},
): CardDocument {
  const fields = Array.isArray(legacy.fields) ? legacy.fields : [];

  const side: CardSide = {
    id: newId(),
    name: "Front",
    background: resolveBackground(options),
    // Array order preserved verbatim. v1's renderer composited
    // `template.fields` in array order (`engine.ts:176`), so order already WAS
    // z-order implicitly — the migration is order-preserving by construction.
    children: fields.map(migrateField),
  };

  return CardDocument.parse({
    schemaVersion: SCHEMA_VERSION,
    canvas: {
      width: numberOr(legacy.width, 1012),
      height: numberOr(legacy.height, 638),
      unit: legacy.unit === "mm" || legacy.unit === "in" ? legacy.unit : "px",
      dpi: 300,
    },
    sides: [side],
    fonts: collectFonts(fields),
    palette: [],
  });
}

function resolveBackground(options: MigrateOptions): CardSide["background"] {
  if (options.backgroundAssetId) {
    return { kind: "image", src: { kind: "asset", assetId: options.backgroundAssetId }, fit: "fill" };
  }
  if (options.backgroundUrl) {
    return { kind: "image", src: { kind: "url", url: options.backgroundUrl }, fit: "fill" };
  }
  // v1 initialised the Fabric canvas with a white background.
  return { kind: "color", color: "#FFFFFF" };
}

function migrateField(field: LegacyField): DesignNode {
  const transform = {
    x: numberOr(field.x, 0),
    y: numberOr(field.y, 0),
    width: Math.max(1, numberOr(field.width, V1.width)),
    height: Math.max(1, numberOr(field.height, V1.height)),
    rotation: numberOr(field.rotation, 0),
    opacity: clamp01(numberOr(field.opacity, 1)),
    flipX: false,
    flipY: false,
  };

  // A new id is minted rather than carrying `field.id` across, because v1 ids
  // were recomputed from the array index on every save (`field-1`, `field-2`,
  // …). Carrying them would import ids that are guaranteed to collide with the
  // next document migrated from the same shape.
  const id = newId();
  const name = field.fieldName ?? "";

  const shadow =
    numberOr(field.shadowBlur, 0) > 0
      ? {
          color: field.shadowColor ?? "#000000",
          blur: numberOr(field.shadowBlur, 0),
          offsetX: numberOr(field.shadowOffsetX, 0),
          offsetY: numberOr(field.shadowOffsetY, 0),
        }
      : null;

  const base = { id, name, locked: false, hidden: false, transform, shadow };

  if (field.fieldType === "image") {
    return {
      ...base,
      type: "image",
      // v1 matched a card's photo by `card_id`, one image per card, resolved
      // outside the document (`load-project.ts`). v2 makes that binding
      // explicit — and in doing so removes v1's limitation that every image
      // field on a card showed the SAME photo.
      src: { kind: "column", column: "card_id", fallbackAssetId: null },
      fit: "cover",
      clip: migrateClip(field),
      border:
        numberOr(field.borderWidth, V1.borderWidth) > 0
          ? {
              color: field.borderColor ?? V1.borderColor,
              width: numberOr(field.borderWidth, V1.borderWidth),
              align: "center" as const,
            }
          : null,
    };
  }

  if (field.fieldType === "qr") {
    return {
      ...base,
      type: "code",
      symbology: "qr",
      // v1 fell back to `row.card_id` when the bound value was empty
      // (`engine.ts`), which a template binding reproduces exactly.
      value: { source: "template", pattern: `{{${name || "card_id"}}}`, fallback: "" },
      foreground: "#000000",
      background: null,
      errorCorrection: "M",
      quietZone: 0,
    };
  }

  return {
    ...base,
    type: "text",
    content: { source: "column", column: name, fallback: "" },
    typography: migrateTypography(field),
    stroke:
      numberOr(field.strokeWidth, 0) > 0
        ? {
            color: field.strokeColor ?? "#000000",
            width: numberOr(field.strokeWidth, 0),
            align: "center" as const,
          }
        : null,
  };
}

function migrateTypography(field: LegacyField): Typography {
  return {
    fontFamily: field.fontFamily ?? V1.fontFamily,
    // v1 only ever expressed normal/bold.
    fontWeight: field.fontWeight === "bold" ? 700 : 400,
    fontStyle: field.fontStyle === "italic" ? "italic" : "normal",
    fontSize: numberOr(field.fontSize, V1.fontSize),
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: field.align ?? "left",
    // v1's renderer vertically centred text within the field box via a
    // heuristic (`engine.ts:55`), so "middle" is what these documents actually
    // looked like — "top" would silently move every text element on import.
    verticalAlign: "middle",
    textTransform: "none",
    underline: field.underline ?? false,
    color: field.color ?? V1.color,
    // v1 could not wrap at all. Migrating to "none" preserves the old
    // appearance exactly; users opt into wrapping deliberately, rather than
    // having their existing cards silently reflow on first open.
    autoFit: "none",
    minFontSize: 8,
    maxLines: null,
  };
}

function migrateClip(field: LegacyField): ClipShape {
  switch (field.shape) {
    case "circle":
      return { kind: "ellipse" };
    case "triangle":
      // v1 masked with an isosceles triangle spanning the field box.
      return { kind: "polygon", points: [[0.5, 0], [1, 1], [0, 1]] };
    default:
      return { kind: "rect", cornerRadius: numberOr(field.cornerRadius, 0) };
  }
}

/** v1 stored no font manifest; the set is whatever the fields reference.
 *  Marked "builtin" because v1's custom fonts used generated family names
 *  (`CustomFont_<uuid>`) that the importing environment must re-resolve
 *  against the fonts table anyway. */
function collectFonts(fields: LegacyField[]): CardDocument["fonts"] {
  const seen = new Map<string, CardDocument["fonts"][number]>();

  for (const field of fields) {
    if (field.fieldType === "image" || field.fieldType === "qr") continue;
    const family = field.fontFamily ?? V1.fontFamily;
    const weight = field.fontWeight === "bold" ? 700 : 400;
    const style = field.fontStyle === "italic" ? "italic" : "normal";
    const key = `${family}:${weight}:${style}`;
    if (!seen.has(key)) {
      seen.set(key, { family, weight, style, source: { kind: "builtin" } });
    }
  }

  return [...seen.values()];
}

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
