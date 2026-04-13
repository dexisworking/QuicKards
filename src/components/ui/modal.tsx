"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { PropsWithChildren } from "react";

type ModalProps = PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
}>;

export const Modal = ({ open, onClose, title, children }: ModalProps) => {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--surface)] p-4 md:max-h-[80vh] md:max-w-lg md:rounded-2xl"
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-zinc-300 pb-2">
              <h3 className="text-sm font-semibold">{title}</h3>
              <button className="swiss-btn-ghost px-2 py-1 text-xs" onClick={onClose} type="button">
                Close
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
