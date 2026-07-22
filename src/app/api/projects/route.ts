// ============================================
// QUICKARDS — Project creation API
// ============================================
//
// A project is always attached to the active organization; template ownership
// is checked before storing its id so one tenant cannot point at another's.

import { z } from "zod";

import { requireOrgScope } from "@/lib/auth/session";
import { OrgScopeError, scoped } from "@/lib/db/scope";
import { errorResponse } from "@/lib/http/errors";

export const runtime = "nodejs";
const CreateProject = z.object({ name: z.string().trim().min(1).max(120), templateId: z.string().uuid().optional() });

export async function POST(request: Request) {
  try {
    const body = CreateProject.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "A project name is required" }, { status: 400 });
    const repo = scoped(await requireOrgScope());
    if (body.data.templateId && !(await repo.templates.byId(body.data.templateId))) throw new OrgScopeError("Template not found");
    const id = await repo.projects.create(body.data);
    return Response.json({ id }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
