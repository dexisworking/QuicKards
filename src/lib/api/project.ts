import type { Databases } from "node-appwrite";
import { jsonError } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toProjectRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";

export const ensureProjectAccess = async (
  databases: Databases,
  projectId: string,
  userId: string,
): Promise<
  | { project: { id: string; user_id: string; template_id: string | null; name: string; status: string } }
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

    return {
      project: {
        id: project.id,
        user_id: project.user_id,
        template_id: project.template_id,
        name: project.name,
        status: project.status,
      },
    };
  } catch {
    return { errorResponse: jsonError("Project not found", 404) };
  }
};
