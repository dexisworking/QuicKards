// ============================================
// QUICKARDS — Ephemeral editor UI state
// ============================================
//
// Selection, viewport state and the active side are intentionally outside the
// document store: clicking a node should never create an undo entry.

import { create } from "zustand";

type UiState = {
  selectedIds: string[];
  activeSideId: string | null;
  zoom: number;
  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  setActiveSide: (id: string) => void;
  setZoom: (zoom: number) => void;
};

export const useUiStore = create<UiState>((set) => ({
  selectedIds: [],
  activeSideId: null,
  zoom: 0.72,
  setSelected: (selectedIds) => set({ selectedIds }),
  toggleSelected: (id) => set((state) => ({
    selectedIds: state.selectedIds.includes(id)
      ? state.selectedIds.filter((item) => item !== id)
      : [...state.selectedIds, id],
  })),
  setActiveSide: (activeSideId) => set({ activeSideId, selectedIds: [] }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(1.5, zoom)) }),
}));
