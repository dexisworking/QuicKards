// ============================================
// QUICKARDS — App shell (authenticated)
// ============================================
//
// The gate for everything behind sign-in. No session → sign-in. First visit
// with no org → a personal workspace is created. The [data-app-theme] wrapper
// here is what switches the whole app surface between light and dark; the theme
// is read from the cookie server-side so there is no wrong-theme flash.

import { redirect } from "next/navigation";

import AppNav from "@/components/app/AppNav";
import { getSessionUser } from "@/lib/auth/session";
import { ensureOrganization } from "@/lib/auth/onboarding";
import { getAppTheme } from "@/lib/theme.server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  await ensureOrganization(user.id, user.name || user.email.split("@")[0]);
  const theme = await getAppTheme();

  return (
    <div id="qk-app" data-app-theme={theme} className="min-h-dvh bg-[var(--k-bg)] text-[var(--k-text)]">
      <AppNav user={user} theme={theme} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
