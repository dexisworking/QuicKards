// ============================================
// QUICKARDS — Route error mapping
// ============================================
//
// One place that turns the exceptions our service layer throws into HTTP
// responses, so every route handler reports failures the same way.

import { AuthError } from "@/lib/auth/session";
import { OrgScopeError } from "@/lib/db/scope";

export function errorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  // A scope miss is deliberately a 404, not a 403: telling a caller "this
  // exists but is not yours" leaks cross-tenant existence.
  if (error instanceof OrgScopeError) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Unknown failures are logged server-side and returned opaque — never echo an
  // internal error message (it can carry SQL, keys, or paths) to the client.
  console.error("[api] unhandled error:", error);
  return Response.json({ error: "Internal error" }, { status: 500 });
}
