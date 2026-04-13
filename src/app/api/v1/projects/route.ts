import { ID, Query } from "node-appwrite";
import { requireUser } from "@/lib/api/auth";
import { safeJson } from "@/lib/api/request";
import { jsonError, jsonOk } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toProjectRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";
import { isExpiredResource } from "@/lib/expiry";

type CreateProjectBody = {
  name?: string;
  template_id?: string | null;
};

export async function GET() {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const projects = await auth.databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.projects, [
      Query.equal("userId", auth.user.$id),
      Query.orderDesc("$createdAt"),
      Query.limit(500),
    ]);

    const normalizedProjects = projects.documents.map((document) => toProjectRecord(document));
    const [expired, active] = normalizedProjects.reduce<[typeof normalizedProjects, typeof normalizedProjects]>(
      (acc, project) => {
        if (isExpiredResource(project.created_at)) {
          acc[0].push(project);
        } else {
          acc[1].push(project);
        }
        return acc;
      },
      [[], []],
    );

    if (expired.length > 0) {
      await Promise.allSettled(
        expired.map((item) =>
          auth.databases.deleteDocument(serverEnv.appwriteDatabaseId, appwriteCollections.projects, item.id),
        ),
      );
    }

    return jsonOk({
      projects: active,
    });
  } catch (error) {
    return jsonError("Failed to list projects", 500, String(error));
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const body = await safeJson<CreateProjectBody>(request);
  if (!body?.name?.trim()) {
    return jsonError("Project name is required", 400);
  }

  try {
    const created = await auth.databases.createDocument(
      serverEnv.appwriteDatabaseId,
      appwriteCollections.projects,
      ID.unique(),
      {
        userId: auth.user.$id,
        templateId: body.template_id ?? null,
        name: body.name.trim(),
        status: "draft",
      },
    );

    return jsonOk({ project: toProjectRecord(created) }, { status: 201 });
  } catch (error) {
    return jsonError("Failed to create project", 500, String(error));
  }
}
