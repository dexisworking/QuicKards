// ============================================
// QUICKARDS — Job status
// ============================================
//
// Polled by the UI while a render runs. Returns progress and, on completion,
// the warning report (substituted fonts, missing photos) that replaces v1's
// silent degradation.

import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";
import { errorResponse } from "@/lib/http/errors";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const scope = await requireOrgScope();

    const job = await scoped(scope).jobs.byId(id);
    if (!job) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      total: job.total,
      warnings: job.warnings,
      error: job.error,
      hasOutput: Boolean(job.outputR2Key),
      completedAt: job.completedAt,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
