// ============================================
// QUICKARDS — SVG intermediate representation
// ============================================
//
// The load-bearing type of the whole rebuild.
//
// v1 had two renderers: Fabric.js objects in the editor and hand-built SVG
// strings on the server. They drifted, as two implementations of one spec
// always do — rotation worked on canvas and was ignored in output, custom
// fonts displayed while designing and never appeared in print.
//
// The fix is not "share the renderer" in the loose sense. It is this: ALL
// layout computation happens once, producing SvgIR, and the two emitters
// (string for resvg, React for the editor) do nothing but walk that tree.
// They never compute geometry, never resolve a binding, never measure text.
// They are therefore structurally incapable of disagreeing about layout.
//
// Attribute names are canonical SVG — `stroke-width`, `text-anchor`,
// `clip-path`. React passes hyphenated attributes through to the DOM verbatim,
// so both emitters consume the same names with no translation layer to get
// wrong. That absence of translation is the point.

export type SvgIR = {
  tag: string;
  attrs: Record<string, string | number>;
  children?: SvgIR[];
  /** Text content. Mutually exclusive with `children` in practice — a <tspan>
   *  carries text, a <g> carries children. */
  text?: string;
};

/** Every way a render can be less than perfect while still producing output.
 *
 *  This type is the structural fix for the bug class the rebuild exists to
 *  eliminate. v1 failed SILENTLY: a missing custom font fell through a bare
 *  `catch {}` (`engine.ts:115`) into a fallback stack, and nobody — not the
 *  user, not the logs — knew the 2,000 badges they just printed were in the
 *  wrong typeface.
 *
 *  Warnings propagate to `jobs.warnings` (jsonb) and surface in the UI as
 *  "12 cards rendered with a substituted font". Silent degradation becomes
 *  visible degradation. */
export type RenderWarning =
  | { kind: "font-missing"; family: string; weight: number; nodeId: string }
  | { kind: "image-missing"; nodeId: string; source: string }
  | { kind: "column-missing"; nodeId: string; column: string }
  | { kind: "text-overflow"; nodeId: string; lines: number; maxLines: number }
  | { kind: "code-failed"; nodeId: string; symbology: string; reason: string };

export type BuildResult = {
  ir: SvgIR;
  warnings: RenderWarning[];
};

/** Convenience constructors — these keep `build.ts` readable, which matters
 *  because it is the one file where all the layout logic lives. */
export const el = (
  tag: string,
  attrs: Record<string, string | number>,
  children?: SvgIR[],
): SvgIR => (children && children.length > 0 ? { tag, attrs, children } : { tag, attrs });

export const textEl = (
  tag: string,
  attrs: Record<string, string | number>,
  text: string,
): SvgIR => ({ tag, attrs, text });
