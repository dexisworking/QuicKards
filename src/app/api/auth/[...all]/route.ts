// ============================================
// QUICKARDS — Better Auth catch-all route
// ============================================
//
// Every Better Auth endpoint (sign-in, sign-up, sign-out, session, the whole
// organization plugin surface) is served under /api/auth/* by this one handler.
//
// runtime = "nodejs" because the Drizzle/Neon driver and Better Auth's crypto
// are Node APIs, not Edge. Next 16's proxy/edge split makes this explicit, and
// the failure without it is an opaque bundling error rather than a clear one.

import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth/server";

export const runtime = "nodejs";

export const { GET, POST } = toNextJsHandler(auth.handler);
