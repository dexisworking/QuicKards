// ============================================
// QUICKARDS — Template collection API
// ============================================
//
// Creation happens on the server so every document starts life as an immutable
// version row under the active organization, never as unsaved client state.

import { z } from "zod";

import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";
import { emptyDocument } from "@/lib/design/schema";
import { errorResponse } from "@/lib/http/errors";

export const runtime = "nodejs";

const CreateTemplate = z.object({ name: z.string().trim().min(1).max(120) });

export async function POST(request: Request) {
  try {
    const body = CreateTemplate.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "A template name is required" }, { status: 400 });
    const scope = await requireOrgScope();
    const created = await scoped(scope).templates.create({ name: body.data.name, document: emptyDocument() });
    return Response.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
