// ============================================
// QUICKARDS — cn()
// ============================================
//
// Same helper DexForge uses: clsx for conditional classes, tailwind-merge to
// resolve conflicting Tailwind utilities so the last one wins (e.g. a caller's
// `px-8` overriding a component's default `px-6`).

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
