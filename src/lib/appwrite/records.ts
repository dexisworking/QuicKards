import type { Models } from "node-appwrite";
import type { AssetRecord, CardDataRecord, JobRecord, ProjectRecord, TemplateField, TemplateRecord } from "@/lib/types";

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  if (value !== null && typeof value === "object") {
    return value as T;
  }

  return fallback;
};

const asString = (value: unknown, fallback = ""): string => {
  return typeof value === "string" ? value : fallback;
};

const asNullableString = (value: unknown): string | null => {
  return typeof value === "string" ? value : null;
};

const asNumber = (value: unknown, fallback = 0): number => {
  return typeof value === "number" ? value : fallback;
};

export const toTemplateRecord = (document: Models.Document): TemplateRecord => {
  const data = document as Models.Document & Record<string, unknown>;

  return {
    id: document.$id,
    user_id: asString(data.userId),
    name: asString(data.name),
    width: asNumber(data.width),
    height: asNumber(data.height),
    unit: asString(data.unit, "px"),
    background_url: asNullableString(data.backgroundExternalUrl),
    background_file_id: asNullableString(data.backgroundFileId),
    fields: parseJson<TemplateField[]>(data.fieldsJson, []),
    created_at: document.$createdAt,
  };
};

export const toProjectRecord = (document: Models.Document): ProjectRecord => {
  const data = document as Models.Document & Record<string, unknown>;

  return {
    id: document.$id,
    user_id: asString(data.userId),
    template_id: asNullableString(data.templateId),
    name: asString(data.name),
    status: asString(data.status, "draft"),
    created_at: document.$createdAt,
  };
};

export const toCardDataRecord = (document: Models.Document): CardDataRecord => {
  const data = document as Models.Document & Record<string, unknown>;

  return {
    id: document.$id,
    project_id: asString(data.projectId),
    card_id: asString(data.cardId),
    data: parseJson<Record<string, string>>(data.dataJson, {}),
    created_at: document.$createdAt,
  };
};

export const toAssetRecord = (document: Models.Document): AssetRecord => {
  const data = document as Models.Document & Record<string, unknown>;

  return {
    id: document.$id,
    project_id: asString(data.projectId),
    card_id: asNullableString(data.cardId),
    file_url: asString(data.fileId),
    file_type: asNullableString(data.fileType),
    created_at: document.$createdAt,
  };
};

export const toJobRecord = (document: Models.Document): JobRecord => {
  const data = document as Models.Document & Record<string, unknown>;

  return {
    id: document.$id,
    project_id: asString(data.projectId),
    status: (asString(data.status, "pending") as JobRecord["status"]) ?? "pending",
    output_url: asNullableString(data.outputFileId),
    error: asNullableString(data.errorMessage),
    created_at: document.$createdAt,
    completed_at: asNullableString(data.completedAt),
  };
};
