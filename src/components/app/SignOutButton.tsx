// ============================================
// QUICKARDS — Sign out
// ============================================

"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    await authClient.signOut();
    // Full navigation so the server layout re-evaluates the (now absent) session.
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="grid size-9 place-items-center rounded-[var(--k-radius)] border border-[var(--k-border)] text-[var(--k-text-muted)] transition-colors hover:bg-[var(--k-surface-2)] hover:text-[var(--k-text)] disabled:opacity-50"
      aria-label="Sign out"
    >
      <LogOut className="size-4" />
    </button>
  );
}
