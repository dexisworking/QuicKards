// ============================================
// QUICKARDS — Auth shell
// ============================================
//
// Centered card on the LIGHT app surface (wrapped in [data-app-theme="light"]
// so the --k-* form primitives theme correctly). Already-signed-in users are
// bounced to the dashboard rather than shown a sign-in form.

import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div
      data-app-theme="light"
      className="grid min-h-dvh place-items-center bg-[var(--k-bg)] px-4 py-12"
    >
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-2xl font-bold tracking-tight">
          Quic<span className="text-[var(--k-accent)]">Kards</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
