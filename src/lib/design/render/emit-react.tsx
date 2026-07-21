// ============================================
// QUICKARDS — SvgIR → React elements (client emitter)
// ============================================
//
// The editor's painting path. Like the string emitter, it computes nothing —
// it walks the tree and calls createElement.
//
// This is near-trivial because React passes unknown and hyphenated attributes
// through to the DOM verbatim for SVG elements. `stroke-width`, `text-anchor`,
// `clip-path`, `xml:space` all arrive intact, so both emitters consume the
// SAME canonical SVG attribute names with no translation layer between them.
// A translation layer is exactly the kind of thing that would drift.
//
// Using React elements rather than dangerouslySetInnerHTML is what preserves
// reconciliation: dragging a node re-renders one <g>'s transform attribute,
// not a full teardown and rebuild of the card on every pointermove.

import { createElement, type ReactElement } from "react";

import type { SvgIR } from "./ir";

/** React wants `className`/`htmlFor`, but neither appears in our IR. Two
 *  attributes do need renaming for React's DOM layer. */
const REACT_ATTR: Record<string, string> = {
  "xmlns:xlink": "xmlnsXlink",
  "xml:space": "xmlSpace",
};

export function IRToReact(ir: SvgIR, key?: string | number): ReactElement {
  const props: Record<string, unknown> = { key };

  for (const [name, value] of Object.entries(ir.attrs)) {
    props[REACT_ATTR[name] ?? name] = value;
  }

  if (ir.text !== undefined) {
    return createElement(ir.tag, props, ir.text);
  }

  if (ir.children && ir.children.length > 0) {
    // Index keys are correct here specifically because this tree is derived
    // output, not user-reorderable state — the array is rebuilt wholesale from
    // the document on every render, so an index never refers to a different
    // logical node across renders the way it would in a sortable list.
    return createElement(
      ir.tag,
      props,
      ir.children.map((child, index) => IRToReact(child, index)),
    );
  }

  return createElement(ir.tag, props);
}
