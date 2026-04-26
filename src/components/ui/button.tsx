"use client";

import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import clsx from "clsx";

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
};

export const Button = ({
  children,
  variant = "ghost",
  size = "md",
  fullWidth = false,
  className,
  ...props
}: ButtonProps) => {
  const variantClass =
    variant === "primary"
      ? "swiss-btn"
      : variant === "danger"
        ? "swiss-btn-danger"
        : "swiss-btn-ghost";

  const sizeClass =
    size === "sm"
      ? "text-xs px-2.5 py-1.5"
      : size === "lg"
        ? "text-sm px-5 py-3"
        : "";

  return (
    <motion.button
      whileHover={props.disabled ? undefined : { scale: 1.02 }}
      whileTap={props.disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={clsx(variantClass, sizeClass, fullWidth && "w-full", className)}
      {...props}
    >
      {children}
    </motion.button>
  );
};
