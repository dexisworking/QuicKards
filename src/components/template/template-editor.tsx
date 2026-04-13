"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, QrCode, Settings2, SlidersHorizontal, Type, Wrench } from "lucide-react";
import { CanvasArea } from "@/components/editor/CanvasArea";
import { EditorPropertiesPanel } from "@/components/editor/PropertiesPanel";
import { EditorSidebar } from "@/components/editor/Sidebar";
import { EditorToolbar } from "@/components/editor/Toolbar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
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
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
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
  const [canvasScale, setCanvasScale] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [showSidebarModal, setShowSidebarModal] = useState(false);
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const [showDesktopSettings, setShowDesktopSettings] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const snapRef = useRef(true);

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
    canvas.on("object:moving", (event) => {
      if (!snapRef.current || !event.target) {
        return;
      }
      event.target.set({
        left: Math.round((event.target.left ?? 0) / 10) * 10,
        top: Math.round((event.target.top ?? 0) / 10) * 10,
      });
    });
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
    snapRef.current = snapToGrid;
  }, [snapToGrid]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.setWidth(width);
    canvas.setHeight(height);
    canvas.renderAll();
  }, [height, width]);

  useEffect(() => {
    if (!fabricApi || !fabricCanvasRef.current) {
      return;
    }
    const canvas = fabricCanvasRef.current;
    const sourceUrl = backgroundFile
      ? URL.createObjectURL(backgroundFile)
      : backgroundUrl.trim() || initialTemplate?.background_url || "";
    let revoked = false;

    if (!sourceUrl) {
      canvas.backgroundImage = undefined;
      canvas.renderAll();
      return;
    }

    fabricApi.Image.fromURL(
      sourceUrl,
      (image) => {
        if (revoked) {
          return;
        }
        image.set({
          selectable: false,
          evented: false,
          originX: "left",
          originY: "top",
        });
        canvas.setBackgroundImage(
          image,
          canvas.renderAll.bind(canvas),
          {
            scaleX: width / Math.max(1, image.width ?? width),
            scaleY: height / Math.max(1, image.height ?? height),
          },
        );
      },
      { crossOrigin: "anonymous" },
    );

    return () => {
      revoked = true;
      if (backgroundFile) {
        URL.revokeObjectURL(sourceUrl);
      }
    };
  }, [backgroundFile, backgroundUrl, fabricApi, height, initialTemplate?.background_url, width]);

  useEffect(() => {
    if (!canvasContainerRef.current) {
      return;
    }

    const resize = () => {
      const containerWidth = canvasContainerRef.current?.clientWidth ?? width;
      setCanvasScale(Math.min(1, containerWidth / Math.max(1, width)));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, [width]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return;
    }
    const effectiveScale = canvasScale * zoomLevel;
    canvas.setDimensions({ width: width * effectiveScale, height: height * effectiveScale });
    canvas.setZoom(effectiveScale);
    canvas.renderAll();
  }, [canvasScale, height, width, zoomLevel]);

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

  const setPreviewState = (enabled: boolean) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.getObjects().forEach((object) => {
      const meta = extractMeta(object);
      if (!meta) {
        return;
      }
      if (object.type === "textbox") {
        const textObject = object as import("fabric").fabric.Textbox;
        textObject.set({ text: enabled ? `Sample ${meta.fieldName}` : meta.fieldName });
      } else if (object.type === "rect") {
        object.set({
          fill: enabled ? "rgba(99,102,241,0.18)" : "rgba(0,0,0,0.04)",
        });
      }
    });
    setPreviewMode(enabled);
    canvas.renderAll();
  };

  const zoomIn = () => setZoomLevel((value) => Math.min(2, Number((value + 0.1).toFixed(2))));
  const zoomOut = () => setZoomLevel((value) => Math.max(0.5, Number((value - 0.1).toFixed(2))));

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

  const saveTemplate = async () => {
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
    <div className="space-y-3">
      <EditorToolbar
        name={name}
        setName={setName}
        width={width}
        height={height}
        onSave={saveTemplate}
        onPreviewToggle={() => setPreviewState(!previewMode)}
        previewMode={previewMode}
        busy={isSaving}
      />

      <div className="grid gap-3 xl:grid-cols-[72px_280px_minmax(0,1fr)_320px]">
        <aside className="hidden xl:flex">
          <div className="swiss-section flex h-fit w-full flex-col gap-2 p-2">
            <Button type="button" title="Add text field" onClick={addTextField}>
              <Type className="h-4 w-4" />
            </Button>
            <Button type="button" title="Add image field" onClick={() => addShapeField("image")}>
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button type="button" title="Add QR field" onClick={() => addShapeField("qr")}>
              <QrCode className="h-4 w-4" />
            </Button>
            <Button type="button" variant={showDesktopSettings ? "primary" : "ghost"} title="Toggle settings panel" onClick={() => setShowDesktopSettings((value) => !value)}>
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </aside>

        <div className="hidden xl:block">
          {showDesktopSettings ? (
            <EditorSidebar
              width={width}
              height={height}
              setWidth={setWidth}
              setHeight={setHeight}
              backgroundUrl={backgroundUrl}
              setBackgroundUrl={setBackgroundUrl}
              setBackgroundFile={setBackgroundFile}
              addTextField={addTextField}
              addImageField={() => addShapeField("image")}
              addQrField={() => addShapeField("qr")}
            />
          ) : (
            <div className="swiss-section p-4">
              <p className="swiss-kicker">Design panel hidden</p>
              <p className="mt-2 text-sm text-zinc-600">Use the left icon rail to add elements. Click settings icon to reopen full panel.</p>
            </div>
          )}
        </div>

        <CanvasArea
          canvasContainerRef={canvasContainerRef}
          canvasRef={canvasRef}
          zoomPercent={Math.round(zoomLevel * 100)}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          showGrid={showGrid}
          onGridToggle={() => {
            setShowGrid((value) => !value);
            setSnapToGrid((value) => !value);
          }}
        />

        <div className="hidden xl:block">
          <EditorPropertiesPanel
            selectedObject={selectedObject}
            fieldName={fieldName}
            setFieldName={setFieldName}
            fontSize={fontSize}
            setFontSize={setFontSize}
            color={color}
            setColor={setColor}
            align={align}
            setAlign={setAlign}
            applySelectedChanges={applySelectedChanges}
            removeSelectedField={removeSelectedField}
          />
        </div>
      </div>

      <div className="sticky bottom-3 z-30 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:hidden">
        <Button type="button" fullWidth onClick={addTextField}>
          <Type className="mr-2 h-4 w-4" />
          Text
        </Button>
        <Button type="button" fullWidth onClick={() => addShapeField("image")}>
          <ImageIcon className="mr-2 h-4 w-4" />
          Image
        </Button>
        <Button type="button" fullWidth onClick={() => setShowSidebarModal(true)}>
          <Wrench className="mr-2 h-4 w-4" />
          Tools
        </Button>
        <Button type="button" fullWidth onClick={() => setShowPropertiesModal(true)}>
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Properties
        </Button>
      </div>

      <Modal open={showSidebarModal} onClose={() => setShowSidebarModal(false)} title="Editor controls">
        <EditorSidebar
          width={width}
          height={height}
          setWidth={setWidth}
          setHeight={setHeight}
          backgroundUrl={backgroundUrl}
          setBackgroundUrl={setBackgroundUrl}
          setBackgroundFile={setBackgroundFile}
          addTextField={addTextField}
          addImageField={() => addShapeField("image")}
          addQrField={() => addShapeField("qr")}
        />
      </Modal>

      <Modal open={showPropertiesModal} onClose={() => setShowPropertiesModal(false)} title="Selected element">
        <EditorPropertiesPanel
          selectedObject={selectedObject}
          fieldName={fieldName}
          setFieldName={setFieldName}
          fontSize={fontSize}
          setFontSize={setFontSize}
          color={color}
          setColor={setColor}
          align={align}
          setAlign={setAlign}
          applySelectedChanges={applySelectedChanges}
          removeSelectedField={removeSelectedField}
        />
      </Modal>

      <Toast message={message} />
    </div>
  );
};
