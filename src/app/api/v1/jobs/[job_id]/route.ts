import { requireUser } from "@/lib/api/auth";
import { ensureProjectAccess } from "@/lib/api/project";
import { jsonError, jsonOk } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toJobRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";
import { encodeFileId } from "@/lib/storage/file-id";

type RouteContext = {
  params: Promise<{ job_id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { job_id: jobId } = await context.params;
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const jobDocument = await auth.databases.getDocument(serverEnv.appwriteDatabaseId, appwriteCollections.jobs, jobId);
    const job = toJobRecord(jobDocument);

    const project = await ensureProjectAccess(auth.databases, job.project_id, auth.user.$id);
    if ("errorResponse" in project) {
      return project.errorResponse;
    }

    const download = job.output_url ? `/api/v1/downloads/${encodeFileId(job.output_url)}` : null;
    return jsonOk({ job, download });
  } catch {
    return jsonError("Job not found", 404);
  }
}
