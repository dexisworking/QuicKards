"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export const SignOutButton = () => {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/v1/auth/signout", { method: "POST" });
        router.refresh();
      }}
      className="swiss-btn-ghost text-xs"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </button>
  );
};
