"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type ToastProps = {
  message: string | null;
  type?: ToastType;
  duration?: number;
};

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--success)" }} />,
  error: <AlertCircle className="h-4 w-4 shrink-0" style={{ color: "var(--danger)" }} />,
  info: <Info className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />,
};

const accentColorMap: Record<ToastType, string> = {
  success: "var(--success)",
  error: "var(--danger)",
  info: "var(--accent)",
};

export const Toast = ({ message, type = "info", duration = 4000 }: ToastProps) => {
  const [visible, setVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);
      setVisible(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, duration);
    } else {
      setVisible(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [message, duration]);

  return (
    <AnimatePresence>
      {visible && currentMessage ? (
        <motion.div
          initial={{ y: 16, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 16, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm shadow-lg"
        >
          {/* Accent bar */}
          <div
            className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
            style={{ background: accentColorMap[type] }}
          />

          {iconMap[type]}

          <span className="flex-1 text-[var(--foreground)]">{currentMessage}</span>

          <button
            onClick={() => setVisible(false)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5">
            <motion.div
              className="h-full"
              style={{ background: accentColorMap[type], opacity: 0.4 }}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: duration / 1000, ease: "linear" }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
