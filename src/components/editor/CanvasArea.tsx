"use client";

import { motion } from "framer-motion";
import { Grid3X3, ZoomIn, ZoomOut } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <Card className="min-h-[360px] sm:min-h-[440px] lg:min-h-[520px]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700">
          Canvas workspace
        </span>
        <Button type="button" onClick={onZoomOut} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs text-zinc-600">{zoomPercent}%</span>
        <Button type="button" onClick={onZoomIn} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={onGridToggle}
          variant={showGrid ? "primary" : "ghost"}
          className="ml-auto"
          title="Toggle grid"
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
      </div>
      <div className="rounded-2xl border border-zinc-300 bg-gradient-to-b from-zinc-100/80 to-zinc-50/50 p-2 sm:p-4">
        <motion.div
          ref={canvasContainerRef}
          className={
            showGrid
              ? "swiss-grid-bg overflow-auto rounded-xl border border-zinc-300 bg-white p-1 sm:p-2"
              : "overflow-auto rounded-xl border border-zinc-300 bg-white p-1 sm:p-2"
          }
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 1 }}
        >
          <canvas ref={canvasRef} />
        </motion.div>
      </div>
    </Card>
  );
};
