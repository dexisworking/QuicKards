// ============================================
// QUICKARDS — Geometry
// ============================================
//
// Pure math shared by the renderer (to emit transforms and clip paths) and the
// editor (to draw selection handles and hit-test). Keeping it in one place is
// what stops the selection box from drifting away from the painted node — the
// classic bug in hand-built editors, where the handle math and the paint math
// are written twice and round differently.

import type { ClipShape, Transform } from "./schema";

export type Rect = { x: number; y: number; width: number; height: number };
export type Point = { x: number; y: number };

export const centerOf = (t: Rect): Point => ({
  x: t.x + t.width / 2,
  y: t.y + t.height / 2,
});

/**
 * The SVG transform for a node, or null when it is the identity.
 *
 * Returning null rather than "translate(0,0)" keeps the emitted markup clean
 * and — more usefully — lets the caller skip wrapping the node in a <g> at
 * all, which keeps the DOM the editor hit-tests against shallower.
 *
 * Order matters: rotate first, then flip, both about the box centre. Flipping
 * after rotation mirrors the rotated result, which is what a user dragging a
 * flip control expects. The reverse order rotates a mirrored box and reads as
 * the rotation running backwards.
 */
export function transformAttr(t: Transform): string | null {
  const parts: string[] = [];
  const cx = t.x + t.width / 2;
  const cy = t.y + t.height / 2;

  if (t.rotation % 360 !== 0) {
    parts.push(`rotate(${round(t.rotation)} ${round(cx)} ${round(cy)})`);
  }
  if (t.flipX || t.flipY) {
    const sx = t.flipX ? -1 : 1;
    const sy = t.flipY ? -1 : 1;
    // Translate to the centre, scale, translate back — SVG scale() is about
    // the origin, not the element.
    parts.push(`translate(${round(cx)} ${round(cy)}) scale(${sx} ${sy}) translate(${round(-cx)} ${round(-cy)})`);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

/** Axis-aligned bounding box of a rotated rect. Used for marquee selection and
 *  for the "select all overlapping" case, where the visual extent — not the
 *  unrotated box — is what the user is pointing at. */
export function rotatedBounds(t: Transform): Rect {
  const rad = (t.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const width = t.width * cos + t.height * sin;
  const height = t.width * sin + t.height * cos;
  const c = centerOf(t);
  return { x: c.x - width / 2, y: c.y - height / 2, width, height };
}

/** Union of rects — the bounding box of a multi-selection or a group. */
export function unionRects(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Geometry for painting an image of intrinsic size `natural` into `box` under
 * a fit mode.
 *
 * `cover` and `contain` both return a rect larger or smaller than the box;
 * `cover` relies on the caller having applied a clip path, which every image
 * node does. v1 delegated this to sharp's `fit: "cover"` and so could not
 * express it in SVG at all — one of several places the two renderers could not
 * even represent the same intent.
 */
export function fitRect(
  natural: { width: number; height: number },
  box: Rect,
  fit: "cover" | "contain" | "fill",
): Rect {
  if (fit === "fill" || natural.width <= 0 || natural.height <= 0) return box;

  const scale =
    fit === "cover"
      ? Math.max(box.width / natural.width, box.height / natural.height)
      : Math.min(box.width / natural.width, box.height / natural.height);

  const width = natural.width * scale;
  const height = natural.height * scale;

  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  };
}

/**
 * SVG path data for a clip shape within `box`.
 *
 * Emitting a path for every shape — including plain rects with a corner radius
 * — rather than switching between <rect>, <ellipse> and <polygon> elements
 * means the clip machinery has exactly one code path. It also sidesteps a real
 * resvg quirk: `<clipPath>` containing mixed element types has historically
 * been less reliable than a single <path>.
 */
export function clipPathData(shape: ClipShape, box: Rect): string {
  switch (shape.kind) {
    case "ellipse": {
      const rx = box.width / 2;
      const ry = box.height / 2;
      const cx = box.x + rx;
      const cy = box.y + ry;
      // Two arcs, because a single 360° arc is degenerate — start and end
      // points coincide and renderers legitimately draw nothing.
      return [
        `M ${round(cx - rx)} ${round(cy)}`,
        `A ${round(rx)} ${round(ry)} 0 1 0 ${round(cx + rx)} ${round(cy)}`,
        `A ${round(rx)} ${round(ry)} 0 1 0 ${round(cx - rx)} ${round(cy)}`,
        "Z",
      ].join(" ");
    }

    case "polygon": {
      const points = shape.points.map(
        ([nx, ny]) => `${round(box.x + nx * box.width)} ${round(box.y + ny * box.height)}`,
      );
      return `M ${points.join(" L ")} Z`;
    }

    default: {
      // Clamp the radius so a large value on a small box degrades to a stadium
      // rather than inverting the corners into a bow-tie.
      const r = Math.max(0, Math.min(shape.cornerRadius, box.width / 2, box.height / 2));
      const { x, y, width: w, height: h } = box;

      if (r === 0) {
        return `M ${round(x)} ${round(y)} H ${round(x + w)} V ${round(y + h)} H ${round(x)} Z`;
      }

      return [
        `M ${round(x + r)} ${round(y)}`,
        `H ${round(x + w - r)}`,
        `A ${round(r)} ${round(r)} 0 0 1 ${round(x + w)} ${round(y + r)}`,
        `V ${round(y + h - r)}`,
        `A ${round(r)} ${round(r)} 0 0 1 ${round(x + w - r)} ${round(y + h)}`,
        `H ${round(x + r)}`,
        `A ${round(r)} ${round(r)} 0 0 1 ${round(x)} ${round(y + h - r)}`,
        `V ${round(y + r)}`,
        `A ${round(r)} ${round(r)} 0 0 1 ${round(x + r)} ${round(y)}`,
        "Z",
      ].join(" ");
    }
  }
}

/**
 * Round to 3 decimal places.
 *
 * Not cosmetic. Unrounded floats produce paths like `100.00000000000001`,
 * which bloat the serialized SVG (these documents are stored as jsonb and
 * shipped to the client) and, worse, make golden-image diffs noisy — two runs
 * that should be byte-identical differ in the last mantissa bit. At 300 DPI,
 * 0.001px is 1/300000th of an inch; nothing is lost.
 */
export function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
