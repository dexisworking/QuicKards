// ============================================
// QUICKARDS — Document editing operations
// ============================================
//
// The interaction layer changes canonical document nodes only. It never
// produces SVG itself; the shared IR builder remains the single painter.

import type { Draft } from "immer";

import { newId, type CardDocument, type DesignNode, type Transform } from "@/lib/design/schema";

export function walk(nodes: DesignNode[], visit: (node: DesignNode) => void): void {
  for (const node of nodes) {
    visit(node);
    if (node.type === "group") walk(node.children, visit);
  }
}

export function findNode(nodes: DesignNode[], id: string): DesignNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === "group") {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function selectedNodes(document: CardDocument, sideId: string, ids: string[]): DesignNode[] {
  const side = document.sides.find((item) => item.id === sideId);
  if (!side) return [];
  return ids.flatMap((id) => {
    const node = findNode(side.children, id);
    return node ? [node] : [];
  });
}

export function mutateSelected(
  document: Draft<CardDocument>,
  sideId: string,
  ids: string[],
  mutate: (transform: Draft<Transform>) => void,
): void {
  const side = document.sides.find((item) => item.id === sideId);
  if (!side) return;
  walk(side.children as DesignNode[], (node) => {
    if (ids.includes(node.id) && !node.locked) mutate(node.transform as Draft<Transform>);
  });
}

export function cloneNode<T extends DesignNode>(node: T): T {
  const cloned = structuredClone(node) as T;
  cloned.id = newId();
  cloned.name = node.name ? `${node.name} copy` : "Copy";
  if (cloned.type === "group") cloned.children = cloned.children.map(cloneNode);
  return cloned;
}

export function addText(document: Draft<CardDocument>, sideId: string): string {
  const side = document.sides.find((item) => item.id === sideId);
  const id = newId();
  side?.children.push({
    id, type: "text", name: "Text", locked: false, hidden: false, shadow: null,
    transform: { x: 100, y: 100, width: 360, height: 72, rotation: 0, opacity: 1, flipX: false, flipY: false },
    content: { source: "static", value: "Double-click to edit" },
    typography: { fontFamily: "Inter", fontWeight: 700, fontStyle: "normal", fontSize: 42, lineHeight: 1.2, letterSpacing: 0, textAlign: "left", verticalAlign: "top", textTransform: "none", underline: false, color: "#111111", autoFit: "wrap", minFontSize: 8, maxLines: null },
    stroke: null,
  });
  return id;
}

export function addShape(document: Draft<CardDocument>, sideId: string): string {
  const side = document.sides.find((item) => item.id === sideId);
  const id = newId();
  side?.children.push({
    id, type: "shape", name: "Rectangle", locked: false, hidden: false, shadow: null,
    transform: { x: 120, y: 220, width: 280, height: 140, rotation: 0, opacity: 1, flipX: false, flipY: false },
    shape: { kind: "rect", cornerRadius: 18 }, fill: "#DC2626", stroke: null,
  });
  return id;
}

export function addCode(document: Draft<CardDocument>, sideId: string): string {
  const side = document.sides.find((item) => item.id === sideId);
  const id = newId();
  side?.children.push({
    id, type: "code", name: "QR code", locked: false, hidden: false, shadow: null,
    transform: { x: 760, y: 390, width: 150, height: 150, rotation: 0, opacity: 1, flipX: false, flipY: false },
    symbology: "qr", value: { source: "column", column: "card_id", fallback: "ID-001" }, foreground: "#000000", background: "#FFFFFF", errorCorrection: "M", quietZone: 4,
  });
  return id;
}
