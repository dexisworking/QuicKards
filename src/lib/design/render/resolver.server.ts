// ============================================
// QUICKARDS — Server ResourceResolver
// ============================================
//
// SERVER ONLY (imports sharp).
//
// Inlines every resource as a `data:` URI, because resvg performs no I/O. This
// is the module where v1's silent-font-failure becomes structurally
// impossible: fonts are loaded ONCE, up front, into both the metrics used for
// wrapping and the buffers handed to resvg. There is no path where one is
// populated and the other is not — which is precisely what went wrong in v1,
// where `loadRenderProject` built `customFonts` and neither render/route.ts
// nor preview/route.ts ever passed it to the renderer.
//
// Storage-agnostic on purpose: it takes loader callbacks rather than importing
// an R2 client, so tests drive it from memory and production drives it from R2
// with no difference in the code under test.

import sharp from "sharp";

import { materializeFont } from "@/lib/render/font-cache";
import { lookupColumn } from "../bindings";
import type { FontRef, ImageSource } from "../schema";
import { metricsFromBytes } from "../text/opentype-metrics";
import type { FontMetrics, ResolvedImage, ResourceResolver } from "./resolver";

export type AssetLoader = (assetId: string) => Promise<Uint8Array | null>;
export type FontLoader = (fontId: string) => Promise<Uint8Array | null>;

export type ServerResolverInput = {
  loadAsset: AssetLoader;
  loadFont: FontLoader;
  /** Per-card photos, keyed by card_id — the single most common image in this
   *  product. Prefetched by the caller in one query rather than resolved one
   *  round-trip at a time, which is what made v1's ZIP import O(n) network
   *  calls. */
  cardImages?: Map<string, string>;
  /** Allow http(s) image sources. Off by default: a render job fetching
   *  arbitrary URLs out of user-authored documents is an SSRF sink, and every
   *  cloud provider's metadata endpoint is one `http://169.254.169.254` away.
   *  Enable only behind an allowlist. */
  allowRemoteUrls?: boolean;
  /**
   * Base64-inline every font into an `@font-face` block in the SVG.
   *
   * OFF by default, for two independent reasons.
   *
   * It does nothing for rasterization: resvg was verified to IGNORE
   * `@font-face` data: URIs entirely and render blank text. It loads fonts
   * only from the filesystem paths in `fontPaths()`.
   *
   * And it is expensive: inlining took one realistic card's SVG from ~6 KB to
   * 1.4 MB, which across a 2,000-card batch is gigabytes of string building
   * for bytes nothing reads.
   *
   * Turn it on ONLY when emitting a standalone SVG that a BROWSER will open —
   * a gallery thumbnail, or a user download — since browsers do honour it.
   */
  inlineFontFaces?: boolean;
};

export type ServerResolver = ResourceResolver & {
  /** Filesystem paths of the loaded fonts, to hand to `rasterize()`.
   *
   *  Paths rather than buffers because resvg has no buffer API — see the note
   *  in `@/lib/render/font-cache`. Materialized during construction so the
   *  same bytes back both the wrapping metrics and the painted glyphs. */
  fontPaths(): string[];
};

type LoadedFace = {
  family: string;
  weight: number;
  style: FontRef["style"];
  metrics: FontMetrics;
};

/**
 * Build a resolver with all fonts already loaded.
 *
 * Fonts load eagerly and are synchronously available afterwards because
 * `resolveFont` is called from inside text layout, which is synchronous — and
 * it is synchronous because making it async would mean every measure() call
 * during an autoFit shrink loop awaits, turning a tight numeric loop into
 * hundreds of microtasks per text node.
 */
export async function createServerResolver(
  fonts: FontRef[],
  input: ServerResolverInput,
): Promise<ServerResolver> {
  // Structured rather than a string-keyed map, because the nearest-weight
  // fallback below compares family/weight/style as fields. Encoding them into
  // one key and parsing it back breaks the moment a family name contains the
  // separator — and "Noto Sans" contains a space.
  const faces: LoadedFace[] = [];
  const paths: string[] = [];
  const faceRules: string[] = [];

  await Promise.all(
    fonts.map(async (font) => {
      if (font.source.kind === "builtin") return;

      const bytes = await input.loadFont(font.source.fontId);
      if (!bytes) return; // surfaces as a font-missing warning at paint time

      const parsed = metricsFromBytes(bytes);
      if (!parsed) return;

      faces.push({
        family: font.family,
        weight: font.weight,
        style: font.style,
        metrics: parsed,
      });
      // Written to disk here, because resvg can only load fonts from paths.
      paths.push(materializeFont(bytes));

      // Only built when the caller asked for a standalone SVG — see
      // `inlineFontFaces`. resvg matches fonts by the name table inside the
      // file it was handed, so it needs none of this.
      if (!input.inlineFontFaces) return;

      faceRules.push(
        [
          "@font-face{",
          `font-family:'${font.family.replaceAll("'", "")}';`,
          `font-weight:${font.weight};`,
          `font-style:${font.style};`,
          `src:url(data:font/ttf;base64,${Buffer.from(bytes).toString("base64")});`,
          "}",
        ].join(""),
      );
    }),
  );

  const imageCache = new Map<string, ResolvedImage | null>();

  return {
    fontPaths: () => paths,

    fontFaceRules: () => faceRules,

    resolveFont(family, weight, style) {
      const exact = faces.find(
        (face) => face.family === family && face.weight === weight && face.style === style,
      );
      if (exact) return exact.metrics;

      // A document asking for Inter 600 when only Inter 400 was uploaded should
      // render in Inter, not fall through to the generic fallback. Nearest
      // weight within the same family and style beats a wrong family — weight
      // is by far the least visible of the three to get slightly off.
      let best: FontMetrics | null = null;
      let bestDelta = Infinity;
      for (const face of faces) {
        if (face.family !== family || face.style !== style) continue;
        const delta = Math.abs(face.weight - weight);
        if (delta < bestDelta) {
          best = face.metrics;
          bestDelta = delta;
        }
      }
      return best;
    },

    async resolveImage(src, row) {
      const key = cacheKey(src, row);
      if (key !== null && imageCache.has(key)) return imageCache.get(key) ?? null;

      const resolved = await load(src, row, input);
      if (key !== null) imageCache.set(key, resolved);
      return resolved;
    },
  };
}

async function load(
  src: ImageSource,
  row: Record<string, string> | null,
  input: ServerResolverInput,
): Promise<ResolvedImage | null> {
  switch (src.kind) {
    case "asset":
      return inline(await input.loadAsset(src.assetId));

    case "url": {
      if (!input.allowRemoteUrls) return null;
      try {
        const response = await fetch(src.url);
        if (!response.ok) return null;
        return inline(new Uint8Array(await response.arrayBuffer()));
      } catch {
        return null;
      }
    }

    case "column": {
      // Design-time preview has no row; fall back to the placeholder asset so
      // the editor shows something sensibly sized rather than a gap.
      const cardId = row ? lookupColumn(row, src.column) : undefined;
      const assetId = cardId ? input.cardImages?.get(cardId) : undefined;
      const target = assetId ?? src.fallbackAssetId;
      if (!target) return null;
      return inline(await input.loadAsset(target));
    }
  }
}

async function inline(bytes: Uint8Array | null): Promise<ResolvedImage | null> {
  if (!bytes || bytes.byteLength === 0) return null;

  // sharp earns its keep here even though it is no longer the renderer: it
  // reads intrinsic dimensions (needed for cover/contain geometry) and
  // normalises EXIF orientation, which phone photos absolutely will carry. An
  // un-rotated portrait photo in a circular crop is the kind of bug that ships
  // 500 sideways badges.
  try {
    const normalised = await sharp(Buffer.from(bytes))
      .rotate() // no args = auto-orient from EXIF, then strip the tag
      .png()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = normalised.info;
    if (!width || !height) return null;

    return {
      href: `data:image/png;base64,${normalised.data.toString("base64")}`,
      width,
      height,
    };
  } catch {
    return null;
  }
}

/**
 * Cache key, or null when the result must not be cached.
 *
 * A column-bound image resolves differently for every row, so caching it
 * without the resolved value in the key would paint card 1's photo onto every
 * card in the batch — a silent, catastrophic, and entirely plausible bug.
 */
function cacheKey(src: ImageSource, row: Record<string, string> | null): string | null {
  switch (src.kind) {
    case "asset":
      return `asset:${src.assetId}`;
    case "url":
      return `url:${src.url}`;
    case "column": {
      const value = row ? lookupColumn(row, src.column) : undefined;
      return value === undefined ? null : `column:${src.column}:${value}`;
    }
  }
}
