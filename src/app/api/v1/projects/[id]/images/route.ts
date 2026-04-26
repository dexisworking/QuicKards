import { ID, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { requireUser } from "@/lib/api/auth";
import { ensureProjectAccess } from "@/lib/api/project";
import { jsonError, jsonOk } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toAssetRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";
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

  const project = await ensureProjectAccess(auth.databases, id, auth.user.$id);
  if ("errorResponse" in project) {
    return project.errorResponse;
  }

  const formData = await request.formData();
  const cardId = (formData.get("card_id") as string | null)?.trim();
  const file = formData.get("file");

  if (!cardId) {
    return jsonError("card_id is required", 400);
  }

  if (!(file instanceof File)) {
    return jsonError("Image file is required", 400);
  }

  try {
    const extension = extensionFromFilename(file.name, "jpg");
    const uploaded = await auth.storage.createFile(
      serverEnv.storageBucketId,
      ID.unique(),
      InputFile.fromBuffer(Buffer.from(await file.arrayBuffer()), file.name),
    );

    const existing = await auth.databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.assets, [
      Query.equal("projectId", id),
      Query.equal("cardId", cardId),
      Query.limit(1),
    ]);

    let assetDocument;
    if (existing.documents.length > 0) {
      assetDocument = await auth.databases.updateDocument(
        serverEnv.appwriteDatabaseId,
        appwriteCollections.assets,
        existing.documents[0].$id,
        {
          fileId: uploaded.$id,
          fileType: contentTypeForExtension(extension),
        },
      );
    } else {
      assetDocument = await auth.databases.createDocument(
        serverEnv.appwriteDatabaseId,
        appwriteCollections.assets,
        ID.unique(),
        {
          userId: auth.user.$id,
          projectId: id,
          cardId,
          fileId: uploaded.$id,
          fileType: contentTypeForExtension(extension),
        },
      );
    }

    return jsonOk({ asset: toAssetRecord(assetDocument) }, { status: 201 });
  } catch (error) {
    return jsonError("Failed to save image mapping", 500, String(error));
  }
}
