import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { requireUser } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toTemplateRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";
import { isExpiredResource } from "@/lib/expiry";
import { contentTypeForExtension, extensionFromFilename } from "@/lib/storage/utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const templateDoc = await auth.databases.getDocument(serverEnv.appwriteDatabaseId, appwriteCollections.templates, id);
    const template = toTemplateRecord(templateDoc);

    if (template.user_id !== auth.user.$id) {
      return jsonError("Template not found", 404);
    }
    if (isExpiredResource(template.created_at)) {
      await auth.databases.deleteDocument(serverEnv.appwriteDatabaseId, appwriteCollections.templates, id);
      return jsonError("Template expired", 404);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("Missing file", 400);
    }

    const extension = extensionFromFilename(file.name, "png");
    const uploaded = await auth.storage.createFile(
      serverEnv.storageBucketId,
      ID.unique(),
      InputFile.fromBuffer(Buffer.from(await file.arrayBuffer()), file.name),
    );

    const updated = await auth.databases.updateDocument(
      serverEnv.appwriteDatabaseId,
      appwriteCollections.templates,
      id,
      {
        backgroundFileId: uploaded.$id,
        backgroundExternalUrl: null,
        backgroundMimeType: contentTypeForExtension(extension),
      },
    );

    return jsonOk({ template: toTemplateRecord(updated) });
  } catch (error) {
    return jsonError("Failed to upload background", 500, String(error));
  }
}
