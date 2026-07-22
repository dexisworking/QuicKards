// ============================================
// QUICKARDS — Enqueue a render
// ============================================
//
// Creates a job PINNED to the template's current design version, fires the
// Inngest event, and returns immediately. The render happens on the queue —
// this handler never blocks on it, unlike v1 which rendered inline.

import { requireOrgScope } from "@/lib/auth/session";
import { releaseReservedCards, reserveCards } from "@/lib/db/billing";
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

    // Reserve the allowance BEFORE creating the job. Atomic, so N concurrent
    // renders cannot each pass the check and collectively exceed the plan.
    const reservation = await reserveCards(scope.organizationId, rows.length);
    if (!reservation.ok) {
      const remaining = Math.max(0, reservation.limit - reservation.used - reservation.reserved);
      return Response.json(
        {
          error: `This render needs ${reservation.requested} cards but only ${remaining} remain on your ${reservation.planName} plan this month.`,
          code: "plan_limit_exceeded",
          limit: reservation.limit,
          used: reservation.used,
          reserved: reservation.reserved,
          requested: reservation.requested,
        },
        { status: 402 },
      );
    }

    try {
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
    } catch (enqueueError) {
      // Never strand a reservation for work that was never queued.
      await releaseReservedCards(scope.organizationId, rows.length);
      throw enqueueError;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
