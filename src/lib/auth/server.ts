// ============================================
// QUICKARDS — Better Auth server instance
// ============================================
//
// Sessions and organizations live in our own Neon database via the Drizzle
// adapter — no third-party auth service, so `member`/`invitation` join cleanly
// against app tables and there is no external user store to reconcile.
//
// This replaces v1's bespoke auth entirely: raw Appwrite session secrets stored
// in a cookie, a two-step signin that minted a long-lived session by hand, and
// row isolation enforced only by manual `userId` checks
// (`src/lib/api/auth.ts`). Here the organization is the tenancy boundary and
// membership is a real table.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";

import { db } from "@/lib/db/client";
import { createPersonalOrg } from "@/lib/db/onboarding";
import * as authSchema from "@/lib/db/schema/auth";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    // Explicit because our `db` is created without a schema map (see
    // client.ts) — the adapter cannot introspect table names otherwise.
    schema: authSchema,
  }),

  databaseHooks: {
    user: {
      create: {
        // Give every new user a personal workspace immediately, so they always
        // have an org to own before reaching any (app) page. Race-free, unlike
        // ensuring it in the layout (which renders concurrently with the page).
        after: async (user) => {
          await createPersonalOrg(user.id, user.name || user.email.split("@")[0]);
        },
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    // Verification email is wired in Phase 6 with Resend; until then a fresh
    // signup is usable immediately, which is what we want for dev.
    requireEmailVerification: false,
  },

  plugins: [
    // Teams/organizations — the thing colleges and event orgs actually buy.
    // A personal account is just an org with one member, so every app table
    // scopes by organizationId and there is no "personal vs team" fork later.
    organization(),

    // MUST be last. Bridges Better Auth's Set-Cookie into Next's async cookie
    // API — required because Next 16 made cookies() async-only, and without
    // this plugin sign-in responses silently fail to persist the session.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
