import type { TemplateDocument, TemplateField } from "@/lib/types";

const asNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const asText = (value: unknown, fallback = ""): string => {
  return typeof value === "string" ? value : fallback;
};

export const normalizeField = (field: unknown, index: number): TemplateField => {
  const source = (field ?? {}) as Record<string, unknown>;

  return {
    id: asText(source.id, `field-${index + 1}`),
    fieldType: (source.fieldType === "image" || source.fieldType === "qr" ? source.fieldType : "text") as
      | "text"
      | "image"
      | "qr",
    fieldName: asText(source.fieldName, `field_${index + 1}`),
    x: asNumber(source.x, 0),
    y: asNumber(source.y, 0),
    width: asNumber(source.width, 180),
    height: asNumber(source.height, 50),
    fontSize: asNumber(source.fontSize, 24),
    color: asText(source.color, "#111111"),
    align: source.align === "center" || source.align === "right" ? source.align : "left",
    fontFamily: asText(source.fontFamily, "Arial"),
  };
};

export const normalizeTemplateDocument = (value: unknown): TemplateDocument => {
  const source = (value ?? {}) as Record<string, unknown>;
  const width = asNumber(source.width, 1012);
  const height = asNumber(source.height, 638);
  const rawFields = Array.isArray(source.fields) ? source.fields : [];

  return {
    width,
    height,
    unit: source.unit === "mm" ? "mm" : "px",
    fields: rawFields.map((field, index) => normalizeField(field, index)),
  };
};
