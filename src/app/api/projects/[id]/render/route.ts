// ============================================
// QUICKARDS — Enqueue a render
// ============================================
//
// Creates a job PINNED to the template's current design version, fires the
// Inngest event, and returns immediately. The render happens on the queue —
// this handler never blocks on it, unlike v1 which rendered inline.

import { requireOrgScope } from "@/lib/auth/session";
import { OrgScopeError, scoped } from "@/lib/db/scope";
import { errorResponse } from "@/lib/http/errors";
import { inngest } from "@/lib/inngest/client";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const scope = await requireOrgScope();
    const repo = scoped(scope);

    const project = await repo.projects.byId(id);
    if (!project) throw new OrgScopeError(`Project ${id} not found`);
    if (!project.templateId) {
      return Response.json({ error: "Project has no template" }, { status: 400 });
    }

    const template = await repo.templates.byId(project.templateId);
    if (!template?.currentVersionId) {
      return Response.json({ error: "Template has no saved design" }, { status: 400 });
    }

    const rows = await repo.cardData.forProject(id);
    if (rows.length === 0) {
      return Response.json({ error: "No card data to render" }, { status: 400 });
    }

    // Pin the version NOW so editing the template mid-render cannot change the
    // output. This is the enqueue-time snapshot the whole safety story rests on.
    const jobId = await repo.jobs.create({
      projectId: id,
      designVersionId: template.currentVersionId,
      total: rows.length,
    });

    await inngest.send({
      name: "project/render.requested",
      data: { jobId, organizationId: scope.organizationId },
    });
    await repo.projects.setStatus(id, "rendering");

    return Response.json({ jobId, total: rows.length });
  } catch (error) {
    return errorResponse(error);
  }
}
