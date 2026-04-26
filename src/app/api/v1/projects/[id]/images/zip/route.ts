import JSZip from "jszip";
import { ID, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { requireUser } from "@/lib/api/auth";
import { ensureProjectAccess } from "@/lib/api/project";
import { getCardIdFromFilename } from "@/lib/api/request";
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
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("Missing ZIP file", 400);
  }

  const zip = await JSZip.loadAsync(Buffer.from(await file.arrayBuffer()));
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);

  if (entries.length === 0) {
    return jsonError("ZIP contains no files", 400);
  }

  try {
    const existingAssets = await auth.databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.assets, [
      Query.equal("projectId", id),
      Query.limit(5000),
    ]);

    const existingByCard = new Map<string, string>();
    existingAssets.documents.forEach((document) => {
      const asset = toAssetRecord(document);
      if (asset.card_id) {
        existingByCard.set(asset.card_id, asset.id);
      }
    });

    let imported = 0;

    for (const entry of entries) {
      const cardId = getCardIdFromFilename(entry.name);
      if (!cardId) {
        continue;
      }

      const extension = extensionFromFilename(entry.name, "jpg");
      const buffer = await entry.async("nodebuffer");
      const uploaded = await auth.storage.createFile(
        serverEnv.storageBucketId,
        ID.unique(),
        InputFile.fromBuffer(buffer, entry.name),
      );

      const existingId = existingByCard.get(cardId);
      if (existingId) {
        await auth.databases.updateDocument(serverEnv.appwriteDatabaseId, appwriteCollections.assets, existingId, {
          fileId: uploaded.$id,
          fileType: contentTypeForExtension(extension),
        });
      } else {
        await auth.databases.createDocument(serverEnv.appwriteDatabaseId, appwriteCollections.assets, ID.unique(), {
          userId: auth.user.$id,
          projectId: id,
          cardId,
          fileId: uploaded.$id,
          fileType: contentTypeForExtension(extension),
        });
      }
      imported += 1;
    }

    await auth.databases.updateDocument(serverEnv.appwriteDatabaseId, appwriteCollections.projects, id, { status: "images_uploaded" });
    return jsonOk({ imported });
  } catch (error) {
    return jsonError("Failed to import ZIP images", 500, String(error));
  }
}
