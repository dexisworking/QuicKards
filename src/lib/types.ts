export type HorizontalAlign = "left" | "center" | "right";

export type TemplateFieldType = "text" | "image" | "qr";

export type TemplateField = {
  id: string;
  fieldType: TemplateFieldType;
  fieldName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  align?: HorizontalAlign;
  fontFamily?: string;
};

export type TemplateDocument = {
  width: number;
  height: number;
  unit?: "px" | "mm";
  fields: TemplateField[];
};

export type TemplateRecord = {
  id: string;
  user_id: string;
  name: string;
  width: number;
  height: number;
  unit: string;
  background_url: string | null;
  background_file_id?: string | null;
  fields: TemplateField[];
  created_at: string;
};

export type ProjectRecord = {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  status: string;
  created_at: string;
};

export type CardDataRecord = {
  id: string;
  project_id: string;
  card_id: string;
  data: Record<string, string>;
  created_at: string;
};

export type AssetRecord = {
  id: string;
  project_id: string;
  card_id: string | null;
  file_url: string;
  file_type: string | null;
  created_at: string;
};

export type JobRecord = {
  id: string;
  project_id: string;
  status: "pending" | "completed" | "failed";
  output_url: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};
