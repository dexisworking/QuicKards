"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TemplateDocument, TemplateField } from "@/lib/types";

type EditorTemplate = {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: string;
  fields: TemplateField[];
  background_url: string | null;
};

type Props = {
  initialTemplate?: EditorTemplate;
};

type FabricApi = typeof import("fabric").fabric;
type FabricCanvas = import("fabric").fabric.Canvas;
type FabricObject = import("fabric").fabric.Object;

type FieldMeta = {
  fieldType: "text" | "image" | "qr";
  fieldName: string;
};

const extractMeta = (object: FabricObject): FieldMeta | null => {
  const value = (object as FabricObject & { quickardsMeta?: FieldMeta }).quickardsMeta;
  if (!value?.fieldName || !value?.fieldType) {
    return null;
  }
  return value;
};

const setMeta = (object: FabricObject, meta: FieldMeta) => {
  (object as FabricObject & { quickardsMeta?: FieldMeta }).quickardsMeta = meta;
};

export const TemplateEditor = ({ initialTemplate }: Props) => {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [fabricApi, setFabricApi] = useState<FabricApi | null>(null);

  const [name, setName] = useState(initialTemplate?.name ?? "New Template");
  const [width, setWidth] = useState(initialTemplate?.width ?? 1012);
  const [height, setHeight] = useState(initialTemplate?.height ?? 638);
  const [backgroundUrl, setBackgroundUrl] = useState(initialTemplate?.background_url ?? "");
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [fieldName, setFieldName] = useState("field_name");
  const [fontSize, setFontSize] = useState(24);
  const [color, setColor] = useState("#111111");
  const [align, setAlign] = useState<"left" | "center" | "right">("left");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let unmounted = false;

    import("fabric").then((module) => {
      if (unmounted) {
        return;
      }
      setFabricApi(module.fabric);
    });

    return () => {
      unmounted = true;
    };
  }, []);

  useEffect(() => {
    if (!fabricApi || !canvasRef.current || fabricCanvasRef.current) {
      return;
    }

    const canvas = new fabricApi.Canvas(canvasRef.current, {
      width,
      height,
      preserveObjectStacking: true,
    });

    canvas.setBackgroundColor("#ffffff", () => {
      canvas.renderAll();
    });

    const updateSelection = () => {
      const selected = canvas.getActiveObject();
      if (!selected) {
        setSelectedObject(null);
        return;
      }

      const meta = extractMeta(selected);
      if (!meta) {
        setSelectedObject(null);
        return;
      }

      setSelectedObject(selected);
      setFieldName(meta.fieldName);

      if (selected.type === "textbox") {
        const textObject = selected as import("fabric").fabric.Textbox;
        setFontSize(Math.round(textObject.fontSize ?? 24));
        setColor(String(textObject.fill ?? "#111111"));
        setAlign((textObject.textAlign as "left" | "center" | "right") ?? "left");
      }
    };

    canvas.on("selection:created", updateSelection);
    canvas.on("selection:updated", updateSelection);
    canvas.on("selection:cleared", () => setSelectedObject(null));
    fabricCanvasRef.current = canvas;

    if (initialTemplate?.fields?.length) {
      initialTemplate.fields.forEach((field) => {
        if (field.fieldType === "text") {
          const text = new fabricApi.Textbox(field.fieldName, {
            left: field.x,
            top: field.y,
            width: field.width,
            fontSize: field.fontSize ?? 24,
            fill: field.color ?? "#111111",
            textAlign: field.align ?? "left",
            fontFamily: field.fontFamily ?? "Arial",
            editable: false,
          });
          setMeta(text, { fieldType: "text", fieldName: field.fieldName });
          canvas.add(text);
          return;
        }

        const rect = new fabricApi.Rect({
          left: field.x,
          top: field.y,
          width: field.width,
          height: field.height,
          fill: "rgba(0,0,0,0.04)",
          stroke: "#2563eb",
          strokeDashArray: [6, 4],
          strokeWidth: 1,
        });
        setMeta(rect, { fieldType: field.fieldType, fieldName: field.fieldName });
        canvas.add(rect);
      });

      canvas.renderAll();
    }

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [fabricApi, height, initialTemplate?.fields, width]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.setWidth(width);
    canvas.setHeight(height);
    canvas.renderAll();
  }, [height, width]);

  const addTextField = () => {
    if (!fabricApi || !fabricCanvasRef.current) {
      return;
    }

    const object = new fabricApi.Textbox("text_field", {
      left: 40,
      top: 40,
      width: 220,
      fontSize: 24,
      fill: "#111111",
      textAlign: "left",
      editable: false,
    });
    setMeta(object, { fieldType: "text", fieldName: "text_field" });
    fabricCanvasRef.current.add(object);
    fabricCanvasRef.current.setActiveObject(object);
    fabricCanvasRef.current.renderAll();
  };

  const addShapeField = (fieldType: "image" | "qr") => {
    if (!fabricApi || !fabricCanvasRef.current) {
      return;
    }

    const object = new fabricApi.Rect({
      left: 40,
      top: 120,
      width: 180,
      height: fieldType === "image" ? 220 : 140,
      fill: "rgba(0,0,0,0.04)",
      stroke: fieldType === "image" ? "#2563eb" : "#16a34a",
      strokeDashArray: [6, 4],
      strokeWidth: 1,
    });

    setMeta(object, {
      fieldType,
      fieldName: fieldType === "image" ? "photo" : "qr_data",
    });
    fabricCanvasRef.current.add(object);
    fabricCanvasRef.current.setActiveObject(object);
    fabricCanvasRef.current.renderAll();
  };

  const applySelectedChanges = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) {
      return;
    }

    const meta = extractMeta(selectedObject);
    if (!meta) {
      return;
    }

    setMeta(selectedObject, { ...meta, fieldName });

    if (selectedObject.type === "textbox") {
      const textObject = selectedObject as import("fabric").fabric.Textbox;
      textObject.set({
        fontSize,
        fill: color,
        text: fieldName,
        textAlign: align,
      });
    }

    canvas.renderAll();
  };

  const removeSelectedField = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) {
      return;
    }
    canvas.remove(selectedObject);
    setSelectedObject(null);
    canvas.renderAll();
  };

  const exportFields = (): TemplateField[] => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return [];
    }

    return canvas
      .getObjects()
      .map((object, index) => {
        const meta = extractMeta(object);
        if (!meta) {
          return null;
        }

        const base: TemplateField = {
          id: `field-${index + 1}`,
          fieldType: meta.fieldType,
          fieldName: meta.fieldName,
          x: object.left ?? 0,
          y: object.top ?? 0,
          width: object.getScaledWidth(),
          height: object.getScaledHeight(),
        };

        if (object.type === "textbox") {
          const textbox = object as import("fabric").fabric.Textbox;
          base.fontSize = Number(textbox.fontSize ?? 24);
          base.color = String(textbox.fill ?? "#111111");
          base.align = (textbox.textAlign as "left" | "center" | "right") ?? "left";
          base.fontFamily = textbox.fontFamily ?? "Arial";
        }

        return base;
      })
      .filter((item): item is TemplateField => item !== null);
  };

  const uploadBackground = async (templateId: string) => {
    if (!backgroundFile) {
      return;
    }

    const formData = new FormData();
    formData.append("file", backgroundFile);

    const response = await fetch(`/api/v1/templates/${templateId}/background`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Failed to upload background");
    }
  };

  const saveTemplate = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setIsSaving(true);

    const payload: TemplateDocument & { name: string; background_url?: string | null } = {
      name: name.trim(),
      width,
      height,
      unit: "px",
      fields: exportFields(),
      background_url: backgroundUrl.trim() || null,
    };

    const method = initialTemplate ? "PATCH" : "POST";
    const path = initialTemplate ? `/api/v1/templates/${initialTemplate.id}` : "/api/v1/templates";
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as {
      template?: { id: string };
      error?: string;
    };
    if (!response.ok || !result.template) {
      setIsSaving(false);
      setMessage(result.error ?? "Failed to save template");
      return;
    }

    try {
      await uploadBackground(result.template.id);
      setMessage("Template saved.");
      setIsSaving(false);
      router.push(`/templates/${result.template.id}`);
      router.refresh();
    } catch (error) {
      setIsSaving(false);
      setMessage(String(error));
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="swiss-section p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <button className="swiss-btn-ghost" onClick={addTextField} type="button">
            Add text
          </button>
          <button className="swiss-btn-ghost" onClick={() => addShapeField("image")} type="button">
            Add image
          </button>
          <button className="swiss-btn-ghost" onClick={() => addShapeField("qr")} type="button">
            Add QR
          </button>
        </div>
        <div className="swiss-grid-bg overflow-auto border border-zinc-300 p-2">
          <canvas ref={canvasRef} />
        </div>
      </section>

      <form className="swiss-section space-y-3 p-4" onSubmit={saveTemplate}>
        <p className="swiss-kicker">Template setup</p>
        <h2 className="text-base font-semibold text-zinc-900">Canvas settings</h2>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          placeholder="Template name"
          className="swiss-input"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={100}
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
            className="swiss-input"
            placeholder="Width"
          />
          <input
            type="number"
            min={100}
            value={height}
            onChange={(event) => setHeight(Number(event.target.value))}
            className="swiss-input"
            placeholder="Height"
          />
        </div>
        <input
          value={backgroundUrl}
          onChange={(event) => setBackgroundUrl(event.target.value)}
          placeholder="Optional background URL"
          className="swiss-input"
        />
        <label className="block text-xs text-zinc-600">
          Optional background image file
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setBackgroundFile(event.target.files?.[0] ?? null)}
            className="swiss-file mt-1"
          />
        </label>

        <div className="border border-zinc-300 p-3">
          <h3 className="text-sm font-semibold text-zinc-900">Selected field</h3>
          {selectedObject ? (
            <div className="mt-2 space-y-2">
              <input
                value={fieldName}
                onChange={(event) => setFieldName(event.target.value)}
                className="swiss-input"
              />
              {selectedObject.type === "textbox" ? (
                <>
                  <input
                    type="number"
                    min={8}
                    value={fontSize}
                    onChange={(event) => setFontSize(Number(event.target.value))}
                    className="swiss-input"
                  />
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="h-10 w-full border border-zinc-300"
                  />
                  <select
                    value={align}
                    onChange={(event) => setAlign(event.target.value as "left" | "center" | "right")}
                    className="swiss-select"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </>
              ) : null}
              <div className="flex gap-2">
                <button type="button" onClick={applySelectedChanges} className="swiss-btn-ghost">
                  Apply field changes
                </button>
                <button type="button" onClick={removeSelectedField} className="swiss-btn-ghost">
                  Remove field
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">Select any field on canvas to edit properties.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="swiss-btn w-full"
        >
          {isSaving ? "Saving..." : "Save template"}
        </button>
        {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
      </form>
    </div>
  );
};
