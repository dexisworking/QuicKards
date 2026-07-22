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
  // Allow requests from the production domain, the configured app URL,
  // localhost aliases, and Vercel preview deployments. Without this, Better
  // Auth's CSRF check rejects any origin that doesn't exactly match
  // BETTER_AUTH_URL.
  trustedOrigins: [
    "https://quickards.iamdex.codes",
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],

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

  // Google is configured only when both secrets exist. This keeps local
  // password development quiet while making the provider live immediately on
  // preview/production once the Google Cloud OAuth credentials are deployed.
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},

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
