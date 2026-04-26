"use client";

import { motion } from "framer-motion";
import { Grid3X3, Minus, Plus } from "lucide-react";
import type { RefObject } from "react";

type CanvasAreaProps = {
  canvasContainerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  showGrid: boolean;
  onGridToggle: () => void;
};

export const CanvasArea = ({
  canvasContainerRef,
  canvasRef,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  showGrid,
  onGridToggle,
}: CanvasAreaProps) => {
  return (
    <div className="swiss-section min-h-[360px] sm:min-h-[440px] lg:min-h-[520px] p-4 relative">
      {/* Canvas container */}
      <div
        className={`rounded-xl border border-[var(--line)] p-2 sm:p-3 ${
          showGrid ? "swiss-dot-grid" : "bg-[var(--surface-2)]"
        }`}
        style={{ boxShadow: "inset 0 2px 8px rgba(0,0,0,0.04)" }}
      >
        <motion.div
          ref={canvasContainerRef}
          className="overflow-auto rounded-lg bg-white"
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <canvas ref={canvasRef} />
        </motion.div>
      </div>

      {/* Floating zoom bar */}
      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-1 shadow-md">
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom out"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <span className="min-w-[3rem] text-center text-xs font-semibold tabular-nums text-[var(--foreground)]">
            {zoomPercent}%
          </span>

          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom in"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          <div className="mx-1 h-4 w-px bg-[var(--line)]" />

          <button
            type="button"
            onClick={onGridToggle}
            title="Toggle grid"
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              showGrid
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            }`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
