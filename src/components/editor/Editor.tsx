// ============================================
// QUICKARDS — Full-bleed card editor
// ============================================
//
// A deliberately hand-built interaction layer over the shared SVG IR. The
// canvas never has a second rendering implementation: pointer gestures alter
// CardDocument state and buildDocumentIR paints the exact result.

"use client";

import { ChevronDown, Grid3X3, Layers3, Minus, MousePointer2, Plus, Redo2, RotateCw, Square, Trash2, Type, Undo2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { IRToReact } from "@/lib/design/render/emit-react";
import { buildDocumentIR } from "@/lib/design/render/build";
import { createClientResolver } from "@/lib/design/render/resolver.client";
import { rotatedBounds, unionRects } from "@/lib/design/geometry";
import type { CardDocument, DesignNode } from "@/lib/design/schema";
import { addCode, addShape, addText, cloneNode, findNode, mutateSelected, selectedNodes, walk } from "@/lib/editor/operations";
import { useDocumentStore } from "@/lib/editor/document-store";
import { useUiStore } from "@/lib/editor/ui-store";
import { cn } from "@/lib/utils";

type EditorProps = { templateId: string; name: string; version: number; document: CardDocument };
type Drag = { x: number; y: number; ids: string[] } | null;

function IconButton({ label, children, onClick, active = false }: { label: string; children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} className={cn("grid size-8 place-items-center rounded-md text-[var(--k-text-muted)] hover:bg-[var(--k-surface-2)] hover:text-[var(--k-text)]", active && "bg-[var(--k-accent-soft)] text-[var(--k-accent)]")}>{children}</button>;
}

export default function Editor({ templateId, name, version, document: initialDocument }: EditorProps) {
  const load = useDocumentStore((state) => state.load);
  const document = useDocumentStore((state) => state.document);
  const mutate = useDocumentStore((state) => state.mutate);
  const begin = useDocumentStore((state) => state.begin);
  const commit = useDocumentStore((state) => state.commit);
  const abort = useDocumentStore((state) => state.abort);
  const undo = useDocumentStore((state) => state.undo);
  const redo = useDocumentStore((state) => state.redo);
  const past = useDocumentStore((state) => state.past);
  const selectedIds = useUiStore((state) => state.selectedIds);
  const setSelected = useUiStore((state) => state.setSelected);
  const toggleSelected = useUiStore((state) => state.toggleSelected);
  const activeSideId = useUiStore((state) => state.activeSideId);
  const setActiveSide = useUiStore((state) => state.setActiveSide);
  const zoom = useUiStore((state) => state.zoom);
  const setZoom = useUiStore((state) => state.setZoom);
  const [paint, setPaint] = useState<ReactNode>(null);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "conflict" | "error">("saved");
  const [baseVersion, setBaseVersion] = useState(version);
  const drag = useRef<Drag>(null);
  const resolver = useMemo(() => createClientResolver(), []);

  useEffect(() => {
    load(initialDocument);
    setActiveSide(initialDocument.sides[0]?.id ?? null);
  }, [initialDocument, load, setActiveSide]);

  useEffect(() => {
    if (!document || !activeSideId) return;
    let cancelled = false;
    setReady(false);
    void (async () => {
      await resolver.loadFonts(document.fonts);
      const result = await buildDocumentIR(document, { sideId: activeSideId, row: null, resolver, mode: "editor" });
      if (!cancelled) {
        const svg = IRToReact(result.ir) as React.ReactElement<{ children?: ReactNode }>;
        setPaint(svg.props.children ?? null);
        setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [document, activeSideId, resolver]);

  // Persist only settled history. Drag moves happen at pointer speed but this
  // debounce creates one immutable version once the user pauses.
  useEffect(() => {
    if (!document || past.length === 0) return;
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/templates/${templateId}/document`, {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ document, baseVersion }),
      });
      if (response.status === 409) { setSaveState("conflict"); return; }
      if (!response.ok) { setSaveState("error"); return; }
      const result = await response.json() as { version: number };
      setBaseVersion(result.version); setSaveState("saved");
    }, 800);
    return () => window.clearTimeout(timer);
  }, [document, past.length, templateId, baseVersion]);

  const side = document?.sides.find((item) => item.id === activeSideId) ?? document?.sides[0];
  const selected = document && side ? selectedNodes(document, side.id, selectedIds) : [];
  const bounds = unionRects(selected.map((node) => rotatedBounds(node.transform)));

  const move = useCallback((deltaX: number, deltaY: number, ids = selectedIds) => {
    if (!side || ids.length === 0) return;
    mutate("Move", (draft) => mutateSelected(draft, side.id, ids, (transform) => {
      transform.x = Math.round((transform.x + deltaX) / 5) * 5;
      transform.y = Math.round((transform.y + deltaY) / 5) * 5;
    }));
  }, [mutate, selectedIds, side]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
      if (event.key === "Escape") { abort(); setSelected([]); return; }
      if (!side || (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        mutate("Delete", (draft) => { const target = draft.sides.find((item) => item.id === side.id); if (target) target.children = target.children.filter((node) => !selectedIds.includes(node.id)); });
        setSelected([]); return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        mutate("Duplicate", (draft) => { const target = draft.sides.find((item) => item.id === side.id); if (!target) return; const copies = target.children.filter((node) => selectedIds.includes(node.id)).map((node) => { const copy = cloneNode(node); copy.transform.x += 20; copy.transform.y += 20; return copy; }); target.children.push(...copies); setSelected(copies.map((copy) => copy.id)); });
        return;
      }
      const amount = event.shiftKey ? 10 : 1;
      if ({ ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1 }[event.key]) {
        event.preventDefault();
        move(event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0, event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [abort, move, mutate, redo, selectedIds, setSelected, side, undo]);

  if (!document || !side) return null;
  const sideId = side.id;

  const nodeList: DesignNode[] = [];
  walk(side.children, (node) => nodeList.push(node));
  const primary = selected.length === 1 ? selected[0] : null;
  const changePrimary = (key: "x" | "y" | "width" | "height" | "rotation", value: number) => {
    if (!primary) return;
    mutate("Transform", (draft) => mutateSelected(draft, side.id, [primary.id], (transform) => { transform[key] = key === "width" || key === "height" ? Math.max(1, value) : value; }));
  };

  return <div className="fixed inset-0 z-[60] flex min-h-dvh bg-[var(--k-bg)] text-[var(--k-text)]">
    <aside className="z-10 flex w-14 shrink-0 flex-col items-center gap-2 border-r border-[var(--k-border)] bg-[var(--k-surface)] py-3">
      <IconButton label="Select" onClick={() => setSelected([])} active><MousePointer2 className="size-4" /></IconButton>
      <div className="h-px w-7 bg-[var(--k-border)]" />
      <IconButton label="Add text" onClick={() => { const id = addTextProxy(); setSelected([id]); }}><Type className="size-4" /></IconButton>
      <IconButton label="Add shape" onClick={() => { const id = addShapeProxy(); setSelected([id]); }}><Square className="size-4" /></IconButton>
      <IconButton label="Add QR code" onClick={() => { const id = addCodeProxy(); setSelected([id]); }}><Grid3X3 className="size-4" /></IconButton>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--k-border)] bg-[var(--k-surface)] px-4">
        <Link href="/templates" className="text-sm text-[var(--k-text-muted)] hover:text-[var(--k-text)]">Templates</Link>
        <span className="text-[var(--k-text-faint)]">/</span><span className="truncate text-sm font-medium">{name}</span>
        <span className={cn("ml-1 text-xs", saveState === "conflict" || saveState === "error" ? "text-[var(--k-danger)]" : "text-[var(--k-text-muted)]")}>{saveState === "saving" ? "Saving…" : saveState === "conflict" ? "Changed elsewhere — reload" : saveState === "error" ? "Could not save" : "Saved"}</span>
        <div className="ml-auto flex items-center gap-1"><IconButton label="Undo" onClick={undo}><Undo2 className="size-4" /></IconButton><IconButton label="Redo" onClick={redo}><Redo2 className="size-4" /></IconButton><div className="mx-2 h-5 w-px bg-[var(--k-border)]" /><IconButton label="Zoom out" onClick={() => setZoom(zoom - .1)}><Minus className="size-4" /></IconButton><span className="w-10 text-center text-xs text-[var(--k-text-muted)]">{Math.round(zoom * 100)}%</span><IconButton label="Zoom in" onClick={() => setZoom(zoom + .1)}><Plus className="size-4" /></IconButton></div>
      </header>
      <main className="relative flex min-h-0 flex-1 overflow-hidden bg-[var(--k-stage)]" onPointerMove={(event) => { const current = drag.current; if (!current) return; const dx = (event.clientX - current.x) / zoom; const dy = (event.clientY - current.y) / zoom; move(dx, dy, current.ids); current.x = event.clientX; current.y = event.clientY; }} onPointerUp={() => { if (drag.current) commit(); drag.current = null; }}>
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(var(--k-stage-grid)_1px,transparent_1px),linear-gradient(90deg,var(--k-stage-grid)_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="relative m-auto shadow-2xl" style={{ width: document.canvas.width * zoom, height: document.canvas.height * zoom }}>
          {!ready && <div className="absolute inset-0 grid place-items-center bg-white text-sm text-zinc-500">Loading fonts…</div>}
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${document.canvas.width} ${document.canvas.height}`} onPointerDown={(event) => { const target = (event.target as Element).closest("[data-node-id]"); const id = target?.getAttribute("data-node-id"); if (!id) { setSelected([]); return; } if (event.shiftKey) toggleSelected(id); else if (!selectedIds.includes(id)) setSelected([id]); const node = findNode(side.children, id); if (node?.locked) return; begin("Move"); drag.current = { x: event.clientX, y: event.clientY, ids: selectedIds.includes(id) ? selectedIds : [id] }; event.currentTarget.setPointerCapture(event.pointerId); }} onDoubleClick={() => { if (primary?.type === "text" && primary.content.source === "static") { const value = window.prompt("Text", primary.content.value); if (value !== null) mutate("Edit text", (draft) => { const node = findNode(draft.sides.find((item) => item.id === side.id)?.children as DesignNode[], primary.id); if (node?.type === "text" && node.content.source === "static") node.content.value = value; }); } }}>
            {paint}
            {bounds && <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="none" stroke="#2563EB" strokeWidth={2 / zoom} vectorEffect="non-scaling-stroke" pointerEvents="none" />}
          </svg>
        </div>
      </main>
    </div>
    <aside className="flex w-72 shrink-0 flex-col border-l border-[var(--k-border)] bg-[var(--k-surface)]">
      <div className="border-b border-[var(--k-border)] p-3"><div className="mb-2 flex items-center gap-2 text-sm font-medium"><Layers3 className="size-4" /> Layers</div><div className="max-h-52 space-y-1 overflow-y-auto">{[...nodeList].reverse().map((node) => <button key={node.id} type="button" onClick={() => setSelected([node.id])} className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-[var(--k-surface-2)]", selectedIds.includes(node.id) && "bg-[var(--k-accent-soft)] text-[var(--k-accent)]")}><span className="truncate">{node.name || node.type}</span><span className="text-[10px] uppercase text-[var(--k-text-faint)]">{node.type}</span></button>)}</div></div>
      <div className="flex-1 overflow-y-auto p-3">{primary ? <><div className="mb-3 text-sm font-medium">{primary.name || primary.type}</div><div className="grid grid-cols-2 gap-2">{(["x", "y", "width", "height", "rotation"] as const).map((key) => <label key={key} className={key === "rotation" ? "col-span-2" : "text-xs text-[var(--k-text-muted)]"}>{key.toUpperCase()}<input className="mt-1 w-full rounded border border-[var(--k-border)] bg-[var(--k-bg)] px-2 py-1 text-sm" type="number" value={Math.round(primary.transform[key])} onChange={(event) => changePrimary(key, Number(event.target.value))} /></label>)}</div>{primary.type === "text" && primary.content.source === "static" && <label className="mt-3 block text-xs text-[var(--k-text-muted)]">Text<textarea className="mt-1 min-h-20 w-full rounded border border-[var(--k-border)] bg-[var(--k-bg)] p-2 text-sm" value={primary.content.value} onChange={(event) => mutate("Edit text", (draft) => { const node = findNode(draft.sides.find((item) => item.id === side.id)?.children as DesignNode[], primary.id); if (node?.type === "text" && node.content.source === "static") node.content.value = event.target.value; })} /></label>}<div className="mt-4 flex gap-2"><button type="button" className="inline-flex items-center gap-1 text-xs text-[var(--k-text-muted)] hover:text-[var(--k-text)]" onClick={() => { mutate("Rotate", (draft) => mutateSelected(draft, side.id, [primary.id], (transform) => { transform.rotation += 15; })); }}><RotateCw className="size-3" /> Rotate</button><button type="button" className="inline-flex items-center gap-1 text-xs text-[var(--k-danger)]" onClick={() => { mutate("Delete", (draft) => { const target = draft.sides.find((item) => item.id === side.id); if (target) target.children = target.children.filter((node) => node.id !== primary.id); }); setSelected([]); }}><Trash2 className="size-3" /> Delete</button></div></> : <p className="text-sm text-[var(--k-text-muted)]">Select an element to edit its position, size, rotation, and content.</p>}</div>
      {document.sides.length > 1 && <div className="border-t border-[var(--k-border)] p-3"><button type="button" className="flex w-full items-center justify-between text-sm" onClick={() => setActiveSide(document.sides.find((item) => item.id !== side.id)?.id ?? side.id)}>{side.name}<ChevronDown className="size-4" /></button></div>}
    </aside>
  </div>;

  function addTextProxy() { let id = ""; mutate("Add text", (draft) => { id = addText(draft, sideId); }); return id; }
  function addShapeProxy() { let id = ""; mutate("Add shape", (draft) => { id = addShape(draft, sideId); }); return id; }
  function addCodeProxy() { let id = ""; mutate("Add QR code", (draft) => { id = addCode(draft, sideId); }); return id; }
}
