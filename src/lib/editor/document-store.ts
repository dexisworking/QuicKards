// ============================================
// QUICKARDS — Patch-based document history
// ============================================
//
// Document edits use Immer patches rather than snapshots. A long editor
// session stays small, selection is not accidentally undoable, and a pointer
// gesture can be committed or cancelled as one transaction.

import { applyPatches, enablePatches, produceWithPatches, type Draft, type Patch } from "immer";
import { create } from "zustand";

import type { CardDocument } from "@/lib/design/schema";

enablePatches();

type Entry = { label: string; patches: Patch[]; inverse: Patch[]; at: number };
type Transaction = { label: string; patches: Patch[]; inverse: Patch[] };

type DocumentState = {
  document: CardDocument | null;
  past: Entry[];
  future: Entry[];
  transaction: Transaction | null;
  load: (document: CardDocument) => void;
  mutate: (label: string, recipe: (draft: Draft<CardDocument>) => void) => void;
  begin: (label: string) => void;
  commit: () => void;
  abort: () => void;
  undo: () => void;
  redo: () => void;
};

const COALESCE_MS = 600;
const HISTORY_LIMIT = 200;

function pushEntry(past: Entry[], entry: Entry): Entry[] {
  const previous = past.at(-1);
  if (previous && previous.label === entry.label && entry.at - previous.at < COALESCE_MS) {
    return [...past.slice(0, -1), {
      ...entry,
      patches: [...previous.patches, ...entry.patches],
      inverse: [...entry.inverse, ...previous.inverse],
    }];
  }
  return [...past, entry].slice(-HISTORY_LIMIT);
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  document: null,
  past: [],
  future: [],
  transaction: null,

  load: (document) => set({ document, past: [], future: [], transaction: null }),

  mutate: (label, recipe) => {
    const current = get().document;
    if (!current) return;
    const [next, patches, inverse] = produceWithPatches(current, recipe);
    if (patches.length === 0) return;
    const transaction = get().transaction;
    if (transaction) {
      set({
        document: next,
        transaction: {
          ...transaction,
          patches: [...transaction.patches, ...patches],
          inverse: [...inverse, ...transaction.inverse],
        },
      });
      return;
    }
    const entry = { label, patches, inverse, at: Date.now() };
    set((state) => ({ document: next, past: pushEntry(state.past, entry), future: [] }));
  },

  begin: (label) => {
    if (!get().transaction) set({ transaction: { label, patches: [], inverse: [] } });
  },

  commit: () => {
    const transaction = get().transaction;
    if (!transaction) return;
    if (transaction.patches.length === 0) {
      set({ transaction: null });
      return;
    }
    const entry = { ...transaction, at: Date.now() };
    set((state) => ({ past: pushEntry(state.past, entry), future: [], transaction: null }));
  },

  abort: () => {
    const { document, transaction } = get();
    if (!document || !transaction) return;
    set({ document: applyPatches(document, transaction.inverse), transaction: null });
  },

  undo: () => {
    const { document, past } = get();
    const entry = past.at(-1);
    if (!document || !entry) return;
    set((state) => ({
      document: applyPatches(document, entry.inverse),
      past: state.past.slice(0, -1),
      future: [entry, ...state.future],
      transaction: null,
    }));
  },

  redo: () => {
    const { document, future } = get();
    const entry = future[0];
    if (!document || !entry) return;
    set((state) => ({
      document: applyPatches(document, entry.patches),
      past: [...state.past, entry],
      future: state.future.slice(1),
      transaction: null,
    }));
  },
}));
