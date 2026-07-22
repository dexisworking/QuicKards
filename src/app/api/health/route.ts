// ============================================
// QUICKARDS — Health check
// ============================================
//
// The Phase 2 exit criterion: proves the app can round-trip Neon. Also the
// endpoint a deploy platform pings for readiness.

import { pingDatabase } from "@/lib/db/health";

export const runtime = "nodejs";
// Never cache a liveness check — a cached "ok" during an outage is the whole
// failure mode this endpoint exists to prevent.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pingDatabase();
    return Response.json({ status: "ok", db: "up" });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        db: "down",
        message: error instanceof Error ? error.message : "unknown error",
      },
      { status: 503 },
    );
  }
}
