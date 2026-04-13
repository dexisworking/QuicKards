import { Query } from "node-appwrite";
import { requireUser } from "@/lib/api/auth";
import { ensureProjectAccess } from "@/lib/api/project";
import { jsonError, jsonOk } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toAssetRecord, toCardDataRecord, toJobRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const projectResult = await ensureProjectAccess(auth.databases, id, auth.user.$id);
  if ("errorResponse" in projectResult) {
    return projectResult.errorResponse;
  }

  try {
    const [cardDataDocuments, assetDocuments, jobDocuments] = await Promise.all([
      auth.databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.cardData, [
        Query.equal("projectId", id),
        Query.orderAsc("$createdAt"),
        Query.limit(5000),
      ]),
      auth.databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.assets, [
        Query.equal("projectId", id),
        Query.orderDesc("$createdAt"),
        Query.limit(5000),
      ]),
      auth.databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.jobs, [
        Query.equal("projectId", id),
        Query.orderDesc("$createdAt"),
        Query.limit(200),
      ]),
    ]);

    return jsonOk({
      project: projectResult.project,
      cardData: cardDataDocuments.documents.map((document) => toCardDataRecord(document)),
      assets: assetDocuments.documents.map((document) => toAssetRecord(document)),
      jobs: jobDocuments.documents.map((document) => toJobRecord(document)),
    });
  } catch (error) {
    return jsonError("Failed to load project details", 500, String(error));
  }
}
