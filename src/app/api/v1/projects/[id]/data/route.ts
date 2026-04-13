import { ID, Query } from "node-appwrite";
import { requireUser } from "@/lib/api/auth";
import { ensureProjectAccess } from "@/lib/api/project";
import { safeJson } from "@/lib/api/request";
import { jsonError, jsonOk } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toCardDataRecord } from "@/lib/appwrite/records";
import { parseCsvContent } from "@/lib/csv/parse";
import { serverEnv } from "@/lib/env/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UploadRowsBody = {
  rows?: Array<Record<string, string>>;
};

const normalizeRows = (rows: Array<Record<string, string>>) => {
  return rows
    .map((row) => ({
      ...row,
      card_id: (row.card_id ?? row.cardId ?? "").trim(),
    }))
    .filter((row) => row.card_id)
    .map((row) => ({
      card_id: row.card_id,
      data: row,
    }));
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const project = await ensureProjectAccess(auth.databases, id, auth.user.$id);
  if ("errorResponse" in project) {
    return project.errorResponse;
  }

  try {
    const rows = await auth.databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.cardData, [
      Query.equal("projectId", id),
      Query.orderAsc("$createdAt"),
      Query.limit(5000),
    ]);
    return jsonOk({ rows: rows.documents.map((document) => toCardDataRecord(document)) });
  } catch (error) {
    return jsonError("Failed to load project data", 500, String(error));
  }
}

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

  let rowsPayload: Array<Record<string, string>> = [];
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await safeJson<UploadRowsBody>(request);
    rowsPayload = body?.rows ?? [];
  } else {
    const formData = await request.formData();
    const file = formData.get("file");
    const text = formData.get("csv");

    if (file instanceof File) {
      rowsPayload = parseCsvContent(await file.text());
    } else if (typeof text === "string") {
      rowsPayload = parseCsvContent(text);
    } else {
      return jsonError("Provide either CSV file or rows JSON", 400);
    }
  }

  const rows = normalizeRows(rowsPayload);
  if (rows.length === 0) {
    return jsonError("No valid rows found. CSV must include card_id column", 400);
  }

  try {
    const existing = await auth.databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.cardData, [
      Query.equal("projectId", id),
      Query.limit(5000),
    ]);

    const existingByCard = new Map<string, string>();
    existing.documents.forEach((document) => {
      const row = toCardDataRecord(document);
      existingByCard.set(row.card_id, row.id);
    });

    for (const row of rows) {
      const existingId = existingByCard.get(row.card_id);
      if (existingId) {
        await auth.databases.updateDocument(serverEnv.appwriteDatabaseId, appwriteCollections.cardData, existingId, {
          dataJson: JSON.stringify(row.data),
        });
      } else {
        await auth.databases.createDocument(serverEnv.appwriteDatabaseId, appwriteCollections.cardData, ID.unique(), {
          userId: auth.user.$id,
          projectId: id,
          cardId: row.card_id,
          dataJson: JSON.stringify(row.data),
        });
      }
    }

    await auth.databases.updateDocument(serverEnv.appwriteDatabaseId, appwriteCollections.projects, id, { status: "data_uploaded" });
    return jsonOk({ imported: rows.length });
  } catch (error) {
    return jsonError("Failed to import CSV data", 500, String(error));
  }
}
