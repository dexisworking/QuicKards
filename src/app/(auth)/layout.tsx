// ============================================
// QUICKARDS — Auth shell
// ============================================
//
// A split sheet: the product's own object on the left, the form on the right.
// Showing the thing being made says more than a list of ticked benefits, and it
// keeps the identity consistent with the landing page.

import Link from "next/link";
import { redirect } from "next/navigation";

import Mark from "@/components/Mark";
import CardSpecimen from "@/components/marketing/CardSpecimen";
import { getSessionUser } from "@/lib/auth/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div data-app-theme="light" className="min-h-dvh bg-[var(--k-bg)] lg:grid lg:grid-cols-[1.05fr_.95fr]">
      {/* Left: the specimen, on the brand's dark ground. */}
      <aside className="qk-grain relative hidden flex-col justify-between overflow-hidden bg-bg p-12 text-ink lg:flex">
        <div className="bg-grid absolute inset-0 opacity-40" aria-hidden />

        <Link href="/" className="relative flex items-center gap-2.5 font-bold tracking-tight">
          <Mark />
          <span>QuicKards</span>
        </Link>

        <div className="relative py-10">
          <CardSpecimen />
        </div>

        <p className="qk-label relative text-text-faint">© 2026 QuicKards · A DexForge product</p>
      </aside>

      {/* Right: the form, on the light app surface. */}
      <div className="flex min-h-dvh items-center justify-center px-4 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 flex items-center justify-center gap-2.5 font-bold tracking-tight text-[var(--k-text)] lg:hidden"
          >
            <Mark />
            <span>QuicKards</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
