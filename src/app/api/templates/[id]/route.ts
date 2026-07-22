// ============================================
// QUICKARDS — Template mutation API
// ============================================
//
// Rename and archive share the same organization-scoped repository path as
// every other template mutation; there is no raw database access in routes.

import { z } from "zod";

import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";
import { errorResponse } from "@/lib/http/errors";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const Rename = z.object({ name: z.string().trim().min(1).max(120) });

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = Rename.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "A template name is required" }, { status: 400 });
    await scoped(await requireOrgScope()).templates.rename(id, body.data.name);
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await scoped(await requireOrgScope()).templates.archive(id);
    return new Response(null, { status: 204 });
  } catch (error) { return errorResponse(error); }
}
