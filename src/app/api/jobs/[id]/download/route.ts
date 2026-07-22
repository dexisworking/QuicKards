// ============================================
// QUICKARDS — Download render output
// ============================================
//
// Redirects to a short-lived presigned R2 URL for the job's output ZIP. The
// bytes stream from R2 straight to the browser — the app never proxies them,
// which is the whole point of the R2 model (v1 streamed every download through
// the server).

import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";
import { errorResponse } from "@/lib/http/errors";
import { presignDownload } from "@/lib/storage/presign";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const scope = await requireOrgScope();

    const job = await scoped(scope).jobs.byId(id);
    if (!job?.outputR2Key) {
      return Response.json({ error: "No output for this job" }, { status: 404 });
    }

    const url = await presignDownload(job.outputR2Key, {
      downloadAs: `quickards-${id}.zip`,
      expiresIn: 300,
    });
    return Response.redirect(url, 302);
  } catch (error) {
    return errorResponse(error);
  }
}
