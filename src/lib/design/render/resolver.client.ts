// ============================================
// QUICKARDS — Browser ResourceResolver
// ============================================
//
// The editor counterpart to resolver.server. It deliberately owns both
// FontFace registration and opentype metrics, so layout is measured against
// the exact bytes the browser paints rather than against a fallback during a
// font-loading flash.

import { lookupColumn } from "../bindings";
import type { FontRef, ImageSource } from "../schema";
import { metricsFromBytes } from "../text/opentype-metrics";
import { fallbackMetrics } from "../text/metrics";
import type { FontMetrics, ResolvedImage, ResourceResolver } from "./resolver";

export type ClientAsset = { href: string; width?: number; height?: number };
export type ClientFont = { id: string; href: string; family: string; weight: number; style: "normal" | "italic" };

export type ClientResolver = ResourceResolver & {
  /** Complete before the first IR build. This is intentionally explicit: FOUT
   *  changes wrapping and therefore makes the editor geometrically dishonest. */
  loadFonts(fonts: FontRef[]): Promise<void>;
};

export function createClientResolver(input: {
  assets?: Record<string, ClientAsset>;
  fonts?: ClientFont[];
} = {}): ClientResolver {
  const faces = new Map<string, FontMetrics>();
  const images = input.assets ?? {};
  const fonts = input.fonts ?? [];

  const fontKey = (family: string, weight: number, style: string) => `${family}\u0000${weight}\u0000${style}`;

  async function imageFromHref(href: string): Promise<ResolvedImage | null> {
    try {
      const image = new Image();
      image.src = href;
      await image.decode();
      return { href, width: image.naturalWidth || 1, height: image.naturalHeight || 1 };
    } catch {
      return null;
    }
  }

  return {
    async loadFonts(documentFonts) {
      await Promise.all(
        documentFonts.map(async (ref) => {
          if (ref.source.kind === "builtin") {
            // Inter is loaded by next/font at the application shell. Waiting
            // here still blocks the first editor paint until it is usable.
            await document.fonts.load(`${ref.style} ${ref.weight} 16px '${ref.family}'`);
            faces.set(fontKey(ref.family, ref.weight, ref.style), fallbackMetrics);
            return;
          }

          const source = ref.source;
          if (!("fontId" in source)) return;
          const font = fonts.find((item) => item.id === source.fontId);
          if (!font) return;
          const response = await fetch(font.href);
          if (!response.ok) return;
          const bytes = new Uint8Array(await response.arrayBuffer());
          const face = new FontFace(font.family, bytes, {
            weight: String(font.weight),
            style: font.style,
            display: "block",
          });
          await face.load();
          document.fonts.add(face);
          const metrics = metricsFromBytes(bytes);
          if (metrics) faces.set(fontKey(font.family, font.weight, font.style), metrics);
        }),
      );
    },

    async resolveImage(src: ImageSource, row) {
      switch (src.kind) {
        case "asset": {
          const asset = images[src.assetId];
          return asset ? imageFromHref(asset.href) : null;
        }
        case "url":
          return imageFromHref(src.url);
        case "column": {
          const value = row ? lookupColumn(row, src.column) : undefined;
          if (value) return imageFromHref(value);
          const fallback = src.fallbackAssetId ? images[src.fallbackAssetId] : undefined;
          return fallback ? imageFromHref(fallback.href) : null;
        }
      }
    },

    resolveFont(family, weight, style) {
      return faces.get(fontKey(family, weight, style)) ?? fallbackMetrics;
    },

    fontFaceRules: () => [],
  };
}
