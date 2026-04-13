import { Query } from "node-appwrite";
import { requireUser } from "@/lib/api/auth";
import { ensureProjectAccess } from "@/lib/api/project";
import { jsonError, jsonOk } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toAssetRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";

type RouteContext = {
  params: Promise<{ id: string; card_id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id, card_id: cardId } = await context.params;
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const project = await ensureProjectAccess(auth.databases, id, auth.user.$id);
  if ("errorResponse" in project) {
    return project.errorResponse;
  }

  try {
    const assets = await auth.databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.assets, [
      Query.equal("projectId", id),
      Query.equal("cardId", cardId),
      Query.limit(1),
    ]);

    if (assets.documents.length === 0) {
      return jsonError("Image not found", 404);
    }

    const asset = toAssetRecord(assets.documents[0]);
    const imageBytes = await auth.storage.getFileView(serverEnv.imageBucketId, asset.file_url);
    const base64 = Buffer.from(new Uint8Array(imageBytes)).toString("base64");
    const mime = asset.file_type ?? "image/jpeg";

    return jsonOk({ card_id: cardId, signedUrl: `data:${mime};base64,${base64}` });
  } catch (error) {
    return jsonError("Failed to read image", 500, String(error));
  }
}
