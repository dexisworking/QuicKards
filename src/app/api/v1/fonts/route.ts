import { ID, Query } from "node-appwrite";
import { requireUser } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toCustomFontRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";
import { isExpiredResource } from "@/lib/expiry";

export async function GET() {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const fonts = await auth.databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.fonts, [
      Query.equal("userId", auth.user.$id),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]);

    const normalizedFonts = fonts.documents.map((document) => toCustomFontRecord(document));
    const [expired, active] = normalizedFonts.reduce<[typeof normalizedFonts, typeof normalizedFonts]>(
      (acc, font) => {
        if (isExpiredResource(font.created_at)) {
          acc[0].push(font);
        } else {
          acc[1].push(font);
        }
        return acc;
      },
      [[], []],
    );

    if (expired.length > 0) {
      await Promise.allSettled(
        expired.map(async (item) => {
          try {
            await auth.databases.deleteDocument(serverEnv.appwriteDatabaseId, appwriteCollections.fonts, item.id);
            await auth.storage.deleteFile(serverEnv.fontBucketId, item.file_id);
          } catch {
            // Ignore partial errors during cleanup
          }
        }),
      );
    }

    return jsonOk({
      fonts: active,
    });
  } catch (error) {
    return jsonError("Failed to list fonts", 500, String(error));
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;

    if (!file || !name) {
      return jsonError("File and name are required", 400);
    }

    // Only allow .ttf and .otf
    if (!file.name.toLowerCase().endsWith(".ttf") && !file.name.toLowerCase().endsWith(".otf")) {
      return jsonError("Only TTF and OTF font files are supported", 400);
    }

    // Convert Web File to Buffer for Appwrite
    const buffer = await file.arrayBuffer();
    const fileToUpload = new File([buffer], file.name, { type: file.type || "application/octet-stream" });

    // 1. Upload file to storage
    const uploadedFile = await auth.storage.createFile(serverEnv.fontBucketId, ID.unique(), fileToUpload);

    // Generate a safe font family name (e.g. alphanumeric)
    const fontFamily = `CustomFont_${ID.unique().replace(/-/g, "")}`;

    // 2. Create document in fonts collection
    const created = await auth.databases.createDocument(
      serverEnv.appwriteDatabaseId,
      appwriteCollections.fonts,
      ID.unique(),
      {
        userId: auth.user.$id,
        name: name.trim(),
        fontFamily,
        fileId: uploadedFile.$id,
      },
    );

    return jsonOk({ font: toCustomFontRecord(created) }, { status: 201 });
  } catch (error) {
    return jsonError("Failed to upload font", 500, String(error));
  }
}
