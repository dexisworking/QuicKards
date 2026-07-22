// ============================================
// QUICKARDS — Fork a starter template
// ============================================
//
// Gallery documents are copied into a new org-owned design version rather
// than referenced in place, so users can freely edit without mutating public
// starters or each other.

import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";
import { errorResponse } from "@/lib/http/errors";

export const runtime = "nodejs";
type Context = { params: Promise<{ slug: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const { slug } = await context.params;
    const created = await scoped(await requireOrgScope()).templates.createFromGallery({ slug });
    return Response.json(created, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
