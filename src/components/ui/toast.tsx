"use client";

import { AnimatePresence, motion } from "framer-motion";

type ToastProps = {
  message: string | null;
};

export const Toast = ({ message }: ToastProps) => {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          className="fixed right-4 top-4 z-50 rounded-xl border border-zinc-300 bg-[var(--surface)] px-4 py-2 text-sm shadow-lg"
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
