import { Query } from "node-appwrite";
import { requireUser } from "@/lib/api/auth";
import { jsonError } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toJobRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";
import { decodeFileId } from "@/lib/storage/file-id";

type RouteContext = {
  params: Promise<{ file_id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { file_id: fileId } = await context.params;
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  let outputFileId: string;
  try {
    outputFileId = decodeFileId(fileId);
  } catch {
    return jsonError("Invalid file id", 400);
  }

  try {
    const jobs = await auth.databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.jobs, [
      Query.equal("outputFileId", outputFileId),
      Query.equal("userId", auth.user.$id),
      Query.limit(1),
    ]);

    if (jobs.documents.length === 0) {
      return jsonError("File not found", 404);
    }

    const job = toJobRecord(jobs.documents[0]);
    if (!job.output_url) {
      return jsonError("File not found", 404);
    }

    const bytes = await auth.storage.getFileDownload(serverEnv.outputBucketId, job.output_url);

    return new Response(Buffer.from(new Uint8Array(bytes)), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="cards-${job.id}.zip"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    return jsonError("Failed to download file", 500, String(error));
  }
}
