// ============================================
// QUICKARDS — Editor font list
// ============================================
//
// The editor needs names and faces but never storage keys. Font byte downloads
// remain a Phase 9 concern, when the upload/library flow is added.

import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";
import { errorResponse } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const fonts = await scoped(await requireOrgScope()).fonts.list();
    return Response.json({ fonts: fonts.map(({ id, name, family, weight, style }) => ({ id, name, family, weight, style })) });
  } catch (error) { return errorResponse(error); }
}
