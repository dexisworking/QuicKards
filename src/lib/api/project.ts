import type { Databases } from "node-appwrite";
import { jsonError } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toProjectRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";
import { isExpiredResource } from "@/lib/expiry";

export const ensureProjectAccess = async (
  databases: Databases,
  projectId: string,
  userId: string,
): Promise<
  | { project: { id: string; user_id: string; template_id: string | null; name: string; status: string; created_at: string } }
  | { errorResponse: ReturnType<typeof jsonError> }
> => {
  try {
    const projectDocument = await databases.getDocument(
      serverEnv.appwriteDatabaseId,
      appwriteCollections.projects,
      projectId,
    );

    const project = toProjectRecord(projectDocument);

    if (project.user_id !== userId) {
      return { errorResponse: jsonError("Project not found", 404) };
    }

    if (isExpiredResource(project.created_at)) {
      await databases.deleteDocument(serverEnv.appwriteDatabaseId, appwriteCollections.projects, projectId);
      return { errorResponse: jsonError("Project expired", 404) };
    }

    return {
      project: {
        id: project.id,
        user_id: project.user_id,
        template_id: project.template_id,
        name: project.name,
        status: project.status,
        created_at: project.created_at,
      },
    };
  } catch {
    return { errorResponse: jsonError("Project not found", 404) };
  }
};
