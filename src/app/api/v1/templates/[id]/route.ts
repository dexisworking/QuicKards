import type { Databases } from "node-appwrite";
import { requireUser } from "@/lib/api/auth";
import { safeJson } from "@/lib/api/request";
import { jsonError, jsonOk } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toTemplateRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";
import { isExpiredResource } from "@/lib/expiry";
import { normalizeTemplateDocument } from "@/lib/template/normalize";

type UpdateTemplateBody = {
  name?: string;
  width?: number;
  height?: number;
  unit?: "px" | "mm" | "in";
  fields?: unknown[];
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

const getOwnedTemplate = async (templateId: string, userId: string, databases: Databases) => {
  const document = await databases.getDocument(serverEnv.appwriteDatabaseId, appwriteCollections.templates, templateId);
  const template = toTemplateRecord(document);

  if (template.user_id !== userId) {
    throw new Error("NOT_FOUND");
  }
  if (isExpiredResource(template.created_at)) {
    await databases.deleteDocument(serverEnv.appwriteDatabaseId, appwriteCollections.templates, templateId);
    throw new Error("EXPIRED");
  }

  return template;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const template = await getOwnedTemplate(id, auth.user.$id, auth.databases);
    return jsonOk({ template });
  } catch {
    return jsonError("Template not found", 404);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const body = await safeJson<UpdateTemplateBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body", 400);
  }

  try {
    await getOwnedTemplate(id, auth.user.$id, auth.databases);
  } catch {
    return jsonError("Template not found", 404);
  }

  const updatePayload: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updatePayload.name = body.name.trim();
  }

  if (body.width !== undefined || body.height !== undefined || body.fields !== undefined || body.unit !== undefined) {
    const normalized = normalizeTemplateDocument({
      width: body.width,
      height: body.height,
      unit: body.unit,
      fields: body.fields ?? [],
    });
    updatePayload.width = normalized.width;
    updatePayload.height = normalized.height;
    updatePayload.unit = normalized.unit;
    updatePayload.fieldsJson = JSON.stringify(normalized.fields);
  }

  try {
    const updated = await auth.databases.updateDocument(
      serverEnv.appwriteDatabaseId,
      appwriteCollections.templates,
      id,
      updatePayload,
    );

    return jsonOk({ template: toTemplateRecord(updated) });
  } catch (error) {
    return jsonError("Failed to update template", 500, String(error));
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    await getOwnedTemplate(id, auth.user.$id, auth.databases);
    await auth.databases.deleteDocument(serverEnv.appwriteDatabaseId, appwriteCollections.templates, id);
    return jsonOk({ deleted: true });
  } catch {
    return jsonError("Template not found", 404);
  }
}
