import { ID, Query } from "node-appwrite";
import { requireUser } from "@/lib/api/auth";
import { safeJson } from "@/lib/api/request";
import { jsonError, jsonOk } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toTemplateRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";
import { normalizeTemplateDocument } from "@/lib/template/normalize";

type CreateTemplateBody = {
  name?: string;
  width?: number;
  height?: number;
  unit?: "px" | "mm";
  fields?: unknown[];
  background_url?: string | null;
};

export async function GET() {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const templates = await auth.databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.templates, [
      Query.equal("userId", auth.user.$id),
      Query.orderDesc("$createdAt"),
      Query.limit(500),
    ]);

    return jsonOk({
      templates: templates.documents.map((document) => toTemplateRecord(document)),
    });
  } catch (error) {
    return jsonError("Failed to list templates", 500, String(error));
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const body = await safeJson<CreateTemplateBody>(request);
  if (!body?.name?.trim()) {
    return jsonError("Template name is required", 400);
  }

  const normalized = normalizeTemplateDocument({
    width: body.width,
    height: body.height,
    unit: body.unit,
    fields: body.fields ?? [],
  });

  try {
    const created = await auth.databases.createDocument(
      serverEnv.appwriteDatabaseId,
      appwriteCollections.templates,
      ID.unique(),
      {
        userId: auth.user.$id,
        name: body.name.trim(),
        width: normalized.width,
        height: normalized.height,
        unit: normalized.unit,
        fieldsJson: JSON.stringify(normalized.fields),
        backgroundExternalUrl: body.background_url ?? null,
        backgroundFileId: null,
      },
    );

    return jsonOk({ template: toTemplateRecord(created) }, { status: 201 });
  } catch (error) {
    return jsonError("Failed to create template", 500, String(error));
  }
}
