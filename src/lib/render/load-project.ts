import type { Databases, Storage } from "node-appwrite";
import { Query } from "node-appwrite";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toAssetRecord, toCardDataRecord, toProjectRecord, toTemplateRecord, toCustomFontRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";
import { isExpiredResource } from "@/lib/expiry";
import { normalizeTemplateDocument } from "@/lib/template/normalize";

type CardRow = {
  card_id: string;
  data: Record<string, string>;
};

export type LoadedRenderProject = {
  template: ReturnType<typeof normalizeTemplateDocument>;
  rows: CardRow[];
  resolveCardImage: (cardId: string) => Promise<Buffer | null>;
  backgroundBuffer: Buffer | null;
  customFonts: Record<string, Buffer>;
};

const toBuffer = (value: ArrayBuffer): Buffer => Buffer.from(new Uint8Array(value));

const fetchBufferFromExternalUrl = async (url: string): Promise<Buffer | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
};

export const loadRenderProject = async (
  databases: Databases,
  storage: Storage,
  projectId: string,
): Promise<LoadedRenderProject> => {
  const projectDoc = await databases.getDocument(serverEnv.appwriteDatabaseId, appwriteCollections.projects, projectId);
  const project = toProjectRecord(projectDoc);
  if (isExpiredResource(project.created_at)) {
    throw new Error("Project expired");
  }

  if (!project.template_id) {
    throw new Error("Project template not found");
  }

  const templateDoc = await databases.getDocument(
    serverEnv.appwriteDatabaseId,
    appwriteCollections.templates,
    project.template_id,
  );
  const template = toTemplateRecord(templateDoc);
  if (isExpiredResource(template.created_at)) {
    throw new Error("Template expired");
  }

  const rowDocuments = await databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.cardData, [
    Query.equal("projectId", projectId),
    Query.orderAsc("$createdAt"),
    Query.limit(5000),
  ]);

  const rows = rowDocuments.documents.map((document) => toCardDataRecord(document)).map((row) => ({
    card_id: row.card_id,
    data: row.data,
  }));

  const assetDocuments = await databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.assets, [
    Query.equal("projectId", projectId),
    Query.limit(5000),
  ]);

  const assetMap = new Map<string, string>();
  assetDocuments.documents.forEach((document) => {
    const asset = toAssetRecord(document);
    if (asset.card_id && asset.file_url) {
      assetMap.set(asset.card_id, asset.file_url);
    }
  });

  const imageCache = new Map<string, Buffer | null>();
  const resolveCardImage = async (cardId: string): Promise<Buffer | null> => {
    if (imageCache.has(cardId)) {
      return imageCache.get(cardId) ?? null;
    }

    const fileId = assetMap.get(cardId);
    if (!fileId) {
      imageCache.set(cardId, null);
      return null;
    }

    try {
      const buffer = toBuffer(await storage.getFileDownload(serverEnv.storageBucketId, fileId));
      imageCache.set(cardId, buffer);
      return buffer;
    } catch {
      imageCache.set(cardId, null);
      return null;
    }
  };

  let backgroundBuffer: Buffer | null = null;
  if (template.background_file_id) {
    try {
      backgroundBuffer = toBuffer(await storage.getFileView(serverEnv.storageBucketId, template.background_file_id));
    } catch {
      backgroundBuffer = null;
    }
  } else if (template.background_url) {
    backgroundBuffer = await fetchBufferFromExternalUrl(template.background_url);
  }

  const fontDocuments = await databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.fonts, [
    Query.equal("userId", project.user_id),
    Query.limit(100),
  ]);

  const customFonts: Record<string, Buffer> = {};
  for (const doc of fontDocuments.documents) {
    const font = toCustomFontRecord(doc);
    try {
      customFonts[font.font_family] = toBuffer(await storage.getFileDownload(serverEnv.storageBucketId, font.file_id));
    } catch {
      // ignore
    }
  }

  return {
    template: normalizeTemplateDocument({
      width: template.width,
      height: template.height,
      unit: template.unit,
      fields: template.fields,
    }),
    rows,
    resolveCardImage,
    backgroundBuffer,
    customFonts,
  };
};
