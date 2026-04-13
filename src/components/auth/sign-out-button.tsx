"use client";

import { useRouter } from "next/navigation";

export const SignOutButton = () => {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/v1/auth/signout", { method: "POST" });
        router.refresh();
      }}
      className="swiss-btn-ghost"
    >
      Sign out
    </button>
  );
};
