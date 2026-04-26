"use client";

import { useState, type PropsWithChildren } from "react";
import { AnimatePresence, motion } from "framer-motion";

type TooltipProps = PropsWithChildren<{
  label: string;
  side?: "top" | "bottom";
}>;

export const Tooltip = ({ label, side = "top", children }: TooltipProps) => {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show ? (
          <motion.span
            initial={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            transition={{ duration: 0.15 }}
            className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--foreground)] px-2.5 py-1 text-xs font-medium text-[var(--background)] shadow-md ${
              side === "top" ? "bottom-full mb-2" : "top-full mt-2"
            }`}
          >
            {label}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
};
