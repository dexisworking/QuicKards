// ============================================
// QUICKARDS — Button
// ============================================
//
// Reads the --k-* app tokens, so it themes correctly on both the light and
// dark app surfaces. Follows the DexForge Button pattern (cva + default export
// + optional href → Link). The accent is QuicKards red in both themes.

"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--k-radius)] font-semibold whitespace-nowrap transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--k-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--k-bg)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-[var(--k-accent)] text-[var(--k-accent-fg)] hover:bg-[var(--k-accent-hover)]",
        secondary:
          "bg-[var(--k-surface-2)] text-[var(--k-text)] border border-[var(--k-border)] hover:bg-[var(--k-surface-hover)]",
        ghost: "text-[var(--k-text-muted)] hover:text-[var(--k-text)] hover:bg-[var(--k-surface-2)]",
        danger: "bg-[var(--k-danger)] text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Props = VariantProps<typeof buttonVariants> &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    children: ReactNode;
    href?: string;
    fullWidth?: boolean;
    loading?: boolean;
    icon?: ReactNode;
  };

export default function Button({
  children,
  variant,
  size,
  href,
  fullWidth,
  loading = false,
  icon,
  className,
  disabled,
  ...props
}: Props) {
  const classes = cn(buttonVariants({ variant, size }), fullWidth && "w-full", className);
  const content = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </>
  );

  if (href && !disabled && !loading) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}

export { buttonVariants };
