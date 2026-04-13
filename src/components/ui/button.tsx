"use client";

import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import clsx from "clsx";

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: "primary" | "ghost";
  fullWidth?: boolean;
};

export const Button = ({ children, variant = "ghost", fullWidth = false, className, ...props }: ButtonProps) => {
  return (
    <motion.button
      whileHover={props.disabled ? undefined : { scale: 1.03 }}
      whileTap={props.disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.18, ease: "easeInOut" }}
      className={clsx(
        variant === "primary" ? "swiss-btn" : "swiss-btn-ghost",
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};
