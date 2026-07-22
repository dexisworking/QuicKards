// ============================================
// QUICKARDS — Better Auth browser client
// ============================================
//
// Used by client components for sign-in/up/out, session reads, and the
// organization surface (create org, invite, switch active org). Same-origin,
// so baseURL is inferred from the browser — nothing to configure.
//
// The organizationClient plugin here MUST mirror the organization() plugin in
// server.ts, or the client-side org methods will not exist at runtime.

"use client";

import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "https://quickards.iamdex.codes",
  plugins: [organizationClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
