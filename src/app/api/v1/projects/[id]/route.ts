import { Query } from "node-appwrite";
import { requireUser } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toAssetRecord, toCardDataRecord, toJobRecord, toProjectRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";
import { isExpiredResource } from "@/lib/expiry";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  let project;
  try {
    const projectDocument = await auth.databases.getDocument(serverEnv.appwriteDatabaseId, appwriteCollections.projects, id);
    project = toProjectRecord(projectDocument);
  } catch {
    return jsonError("Project not found", 404);
  }

  if (project.user_id !== auth.user.$id) {
    return jsonError("Project not found", 404);
  }

  if (isExpiredResource(project.created_at)) {
    await auth.databases.deleteDocument(serverEnv.appwriteDatabaseId, appwriteCollections.projects, id);
    return jsonError("Project expired", 404);
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
      project: {
        id: project.id,
        user_id: project.user_id,
        template_id: project.template_id,
        name: project.name,
        status: project.status,
      },
      cardData: cardDataDocuments.documents.map((document) => toCardDataRecord(document)),
      assets: assetDocuments.documents.map((document) => toAssetRecord(document)),
      jobs: jobDocuments.documents.map((document) => toJobRecord(document)),
    });
  } catch (error) {
    return jsonError("Failed to load project details", 500, String(error));
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const projectDocument = await auth.databases.getDocument(serverEnv.appwriteDatabaseId, appwriteCollections.projects, id);
    const project = toProjectRecord(projectDocument);
    if (project.user_id !== auth.user.$id) {
      return jsonError("Project not found", 404);
    }
    await auth.databases.deleteDocument(serverEnv.appwriteDatabaseId, appwriteCollections.projects, id);
    return jsonOk({ deleted: true });
  } catch {
    return jsonError("Project not found", 404);
  }
}
