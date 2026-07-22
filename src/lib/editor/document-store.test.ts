// ============================================
// QUICKARDS — Document history tests
// ============================================
//
// The interaction layer is only trustworthy if a drag remains one undoable
// operation and Escape restores the exact pre-drag document, so exercise both
// without involving a browser or SVG paint path.

import { describe, expect, it } from "vitest";

import { emptyDocument } from "@/lib/design/schema";
import { useDocumentStore } from "./document-store";

function reset() {
  useDocumentStore.getState().load(emptyDocument());
}

describe("document store", () => {
  it("commits a transaction as one undo step", () => {
    reset();
    const store = useDocumentStore.getState();
    store.begin("Move");
    store.mutate("Move", (draft) => { draft.canvas.width = 900; });
    store.mutate("Move", (draft) => { draft.canvas.height = 500; });
    store.commit();

    expect(useDocumentStore.getState().past).toHaveLength(1);
    expect(useDocumentStore.getState().document?.canvas).toMatchObject({ width: 900, height: 500 });
    useDocumentStore.getState().undo();
    expect(useDocumentStore.getState().document?.canvas).toMatchObject({ width: 1012, height: 638 });
    useDocumentStore.getState().redo();
    expect(useDocumentStore.getState().document?.canvas).toMatchObject({ width: 900, height: 500 });
  });

  it("aborts a transaction with the accumulated inverse patches", () => {
    reset();
    const store = useDocumentStore.getState();
    store.begin("Resize");
    store.mutate("Resize", (draft) => { draft.canvas.width = 850; });
    store.mutate("Resize", (draft) => { draft.canvas.height = 540; });
    store.abort();

    expect(useDocumentStore.getState().document?.canvas).toMatchObject({ width: 1012, height: 638 });
    expect(useDocumentStore.getState().past).toHaveLength(0);
  });
});
