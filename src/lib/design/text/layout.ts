// ============================================
// QUICKARDS — Text layout: wrapping and autoFit
// ============================================
//
// v1 emitted a single <text> node with no wrapping whatsoever
// (`engine.ts:47-82`), while the editor used a Fabric Textbox that wrapped
// happily. So multi-line text looked right while designing and ran off the
// edge of the card in print. This module is the single implementation both
// surfaces now share.
//
// autoFit exists because bulk merge meets real data. A name box sized for
// "Jane Doe" meets "Bartholomew Featherstonehaugh" on row 400. Without it that
// card is silently wrong and nobody notices until the badges come back from
// the printer.

import type { FontMetrics } from "../render/resolver";
import type { Typography } from "../schema";

export type LineBox = {
  text: string;
  /** Baseline offset from the top of the text block, in px. */
  baseline: number;
  /** Measured advance width, for alignment. */
  width: number;
};

export type TextLayout = {
  lines: LineBox[];
  /** The size actually used — below `typography.fontSize` when autoFit shrank. */
  fontSize: number;
  /** Total painted height, for vertical alignment within the node box. */
  height: number;
  /** True when the text still does not fit at `minFontSize`. Drives the
   *  `text-overflow` warning — the card renders, but visibly clipped, and the
   *  user is told which rows are affected rather than discovering it later. */
  overflowed: boolean;
};

export function applyTextTransform(text: string, transform: Typography["textTransform"]): string {
  switch (transform) {
    case "uppercase":
      return text.toLocaleUpperCase();
    case "lowercase":
      return text.toLocaleLowerCase();
    case "capitalize":
      // Only the first letter of each whitespace-delimited word, leaving the
      // rest as authored — "McDonald" must not become "Mcdonald".
      return text.replace(/(^|\s)(\S)/gu, (_m, lead: string, ch: string) => lead + ch.toLocaleUpperCase());
    default:
      return text;
  }
}

/**
 * Greedy word wrap at `maxWidth`.
 *
 * Words longer than the line get broken mid-word rather than allowed to
 * overflow — a 40-character unbroken identifier is rare but real (scanned
 * document ids, concatenated names), and silently running off the card is the
 * worse failure.
 */
function wrapText(
  text: string,
  fontSize: number,
  maxWidth: number,
  metrics: FontMetrics,
  letterSpacing: number,
): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push(""); // preserve authored blank lines
      continue;
    }

    const words = paragraph.split(/(\s+)/).filter((part) => part.length > 0);
    let current = "";

    for (const word of words) {
      const candidate = current + word;
      if (metrics.measure(candidate, fontSize, letterSpacing) <= maxWidth || current === "") {
        current = candidate;
        continue;
      }

      lines.push(current.trimEnd());
      current = word.trimStart();

      // The word alone still overflows — break it character by character.
      while (metrics.measure(current, fontSize, letterSpacing) > maxWidth && current.length > 1) {
        let cut = current.length - 1;
        while (cut > 1 && metrics.measure(current.slice(0, cut), fontSize, letterSpacing) > maxWidth) {
          cut -= 1;
        }
        lines.push(current.slice(0, cut));
        current = current.slice(cut);
      }
    }

    lines.push(current.trimEnd());
  }

  return lines;
}

/**
 * Lay out text within a node box.
 *
 * The shrink loop steps down one px at a time rather than binary-searching.
 * Font sizes here are small integers (8-96), so the loop runs a few dozen
 * times at worst, and each step is a handful of cheap measure() calls against
 * an LRU cache. Binary search would be marginally faster and meaningfully
 * harder to reason about when output looks wrong.
 */
export function layoutText(
  text: string,
  box: { width: number; height: number },
  typography: Typography,
  metrics: FontMetrics,
): TextLayout {
  const transformed = applyTextTransform(text, typography.textTransform);
  const shouldWrap = typography.autoFit === "wrap" || typography.autoFit === "shrink-and-wrap";
  const shouldShrink = typography.autoFit === "shrink" || typography.autoFit === "shrink-and-wrap";

  const minSize = Math.min(typography.minFontSize, typography.fontSize);
  let fontSize = typography.fontSize;
  let raw: string[] = [];
  let overflowed = false;

  for (;;) {
    raw = shouldWrap
      ? wrapText(transformed, fontSize, box.width, metrics, typography.letterSpacing)
      : transformed.split(/\r?\n/);

    const lineHeight = fontSize * typography.lineHeight;
    const totalHeight = raw.length * lineHeight;
    const widest = Math.max(
      0,
      ...raw.map((line) => metrics.measure(line, fontSize, typography.letterSpacing)),
    );

    const tooWide = !shouldWrap && widest > box.width;
    const tooTall = totalHeight > box.height;
    const tooManyLines = typography.maxLines !== null && raw.length > typography.maxLines;
    const fits = !tooWide && !tooTall && !tooManyLines;

    if (fits) break;

    if (!shouldShrink || fontSize <= minSize) {
      overflowed = true;
      break;
    }

    fontSize = Math.max(minSize, fontSize - 1);
  }

  // Hard-truncate to maxLines after shrinking has done what it can, so the
  // clipped result is at least the largest legible one.
  if (typography.maxLines !== null && raw.length > typography.maxLines) {
    raw = raw.slice(0, typography.maxLines);
    overflowed = true;
  }

  const lineHeight = fontSize * typography.lineHeight;
  const ascender = metrics.ascender(fontSize);
  // Centre the em box within the line box so lineHeight > 1 pads symmetrically
  // rather than hanging all the extra space below the text.
  const halfLeading = (lineHeight - fontSize) / 2;

  const lines: LineBox[] = raw.map((lineText, index) => ({
    text: lineText,
    baseline: index * lineHeight + halfLeading + ascender,
    width: metrics.measure(lineText, fontSize, typography.letterSpacing),
  }));

  return { lines, fontSize, height: raw.length * lineHeight, overflowed };
}

/** Left edge of a line within the node box, given horizontal alignment. */
export function lineOffsetX(
  line: LineBox,
  boxWidth: number,
  align: Typography["textAlign"],
): number {
  switch (align) {
    case "center":
      return (boxWidth - line.width) / 2;
    case "right":
      return boxWidth - line.width;
    default:
      // `justify` anchors left; inter-word expansion is a v1.1 concern and
      // looks wrong on the short strings this product actually renders.
      return 0;
  }
}

/** Top edge of the text block within the node box, given vertical alignment. */
export function blockOffsetY(
  layout: TextLayout,
  boxHeight: number,
  align: Typography["verticalAlign"],
): number {
  switch (align) {
    case "middle":
      return (boxHeight - layout.height) / 2;
    case "bottom":
      return boxHeight - layout.height;
    default:
      return 0;
  }
}
