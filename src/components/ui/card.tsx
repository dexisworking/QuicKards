"use client";

import { motion } from "framer-motion";
import type { PropsWithChildren } from "react";
import clsx from "clsx";

type CardProps = PropsWithChildren<{
  className?: string;
  variant?: "elevated" | "flat" | "accent";
  hover?: boolean;
}>;

export const Card = ({
  children,
  className,
  variant = "elevated",
  hover = true,
}: CardProps) => {
  const variantClass =
    variant === "accent"
      ? "swiss-section-accent"
      : variant === "flat"
        ? "swiss-section-flat"
        : "swiss-section";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={clsx(
        variantClass,
        "rounded-2xl p-5",
        hover && "transition-shadow",
        className
      )}
    >
      {children}
    </motion.section>
  );
};
