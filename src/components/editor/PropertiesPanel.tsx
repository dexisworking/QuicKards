"use client";

import { AlignCenter, AlignLeft, AlignRight, Trash2 } from "lucide-react";
import type { fabric } from "fabric";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type FabricObject = fabric.Object;

type PropertiesProps = {
  selectedObject: FabricObject | null;
  fieldName: string;
  setFieldName: (value: string) => void;
  fontSize: number;
  setFontSize: (value: number) => void;
  color: string;
  setColor: (value: string) => void;
  fontFamily: string;
  setFontFamily: (value: string) => void;
  fontWeight: "normal" | "bold";
  setFontWeight: (value: "normal" | "bold") => void;
  fontStyle: "normal" | "italic";
  setFontStyle: (value: "normal" | "italic") => void;
  underline: boolean;
  setUnderline: (value: boolean) => void;
  strokeColor: string;
  setStrokeColor: (value: string) => void;
  strokeWidth: number;
  setStrokeWidth: (value: number) => void;
  shadowColor: string;
  setShadowColor: (value: string) => void;
  shadowBlur: number;
  setShadowBlur: (value: number) => void;
  align: "left" | "center" | "right";
  setAlign: (value: "left" | "center" | "right") => void;
  opacity: number;
  setOpacity: (value: number) => void;
  rotation: number;
  setRotation: (value: number) => void;
  fillColor: string;
  setFillColor: (value: string) => void;
  borderColor: string;
  setBorderColor: (value: string) => void;
  borderWidth: number;
  setBorderWidth: (value: number) => void;
  cornerRadius: number;
  setCornerRadius: (value: number) => void;
  applySelectedChanges: () => void;
  removeSelectedField: () => void;
};

export const EditorPropertiesPanel = ({
  selectedObject,
  fieldName,
  setFieldName,
  fontSize,
  setFontSize,
  color,
  setColor,
  fontFamily,
  setFontFamily,
  fontWeight,
  setFontWeight,
  fontStyle,
  setFontStyle,
  underline,
  setUnderline,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  shadowColor,
  setShadowColor,
  shadowBlur,
  setShadowBlur,
  align,
  setAlign,
  opacity,
  setOpacity,
  rotation,
  setRotation,
  fillColor,
  setFillColor,
  borderColor,
  setBorderColor,
  borderWidth,
  setBorderWidth,
  cornerRadius,
  setCornerRadius,
  applySelectedChanges,
  removeSelectedField,
}: PropertiesProps) => {
  return (
    <Card className="h-full xl:sticky xl:top-20">
      <div className="mb-2 flex items-center justify-between">
        <p className="swiss-kicker">Properties</p>
        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] uppercase tracking-wide text-indigo-700">
          Live style
        </span>
      </div>
      {!selectedObject ? (
        <p className="mt-2 text-sm text-zinc-500">Select an element on canvas to edit its properties.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs text-zinc-500">Field name</label>
            <input className="swiss-input mt-1" value={fieldName} onChange={(event) => setFieldName(event.target.value)} />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Opacity ({Math.round(opacity * 100)}%)</label>
            <input className="swiss-input mt-1" type="range" min={0} max={1} step={0.01} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Rotation ({rotation}°)</label>
            <input className="swiss-input mt-1" type="range" min={-180} max={180} step={1} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} />
          </div>
          {selectedObject.type === "textbox" ? (
            <>
              <div>
                <label className="text-xs text-zinc-500">Font size</label>
                <input className="swiss-input mt-1" type="range" min={8} max={96} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Font family</label>
                <select className="swiss-select mt-1" value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}>
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Noto Sans">Noto Sans</option>
                  <option value="sans-serif">System Sans</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Text color</label>
                <input className="mt-1 h-10 w-full rounded-lg border border-zinc-300" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={fontWeight === "bold" ? "primary" : "ghost"} onClick={() => setFontWeight(fontWeight === "bold" ? "normal" : "bold")}>
                  Bold
                </Button>
                <Button type="button" variant={fontStyle === "italic" ? "primary" : "ghost"} onClick={() => setFontStyle(fontStyle === "italic" ? "normal" : "italic")}>
                  Italic
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                <input type="checkbox" className="h-4 w-4" checked={underline} onChange={(e) => setUnderline(e.target.checked)} />
                Underline
              </label>
              <div>
                <label className="text-xs text-zinc-500">Stroke width</label>
                <input className="swiss-input mt-1" type="range" min={0} max={8} step={0.5} value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Stroke color</label>
                <input className="mt-1 h-10 w-full rounded-lg border border-zinc-300" type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Shadow blur</label>
                <input className="swiss-input mt-1" type="range" min={0} max={32} step={1} value={shadowBlur} onChange={(e) => setShadowBlur(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Shadow color</label>
                <input className="mt-1 h-10 w-full rounded-lg border border-zinc-300" type="color" value={shadowColor} onChange={(e) => setShadowColor(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button type="button" onClick={() => setAlign("left")} variant={align === "left" ? "primary" : "ghost"} title="Align left">
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button type="button" onClick={() => setAlign("center")} variant={align === "center" ? "primary" : "ghost"} title="Align center">
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button type="button" onClick={() => setAlign("right")} variant={align === "right" ? "primary" : "ghost"} title="Align right">
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-zinc-500">Fill color</label>
                <input className="mt-1 h-10 w-full rounded-lg border border-zinc-300" type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Border color</label>
                <input className="mt-1 h-10 w-full rounded-lg border border-zinc-300" type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Border width</label>
                <input className="swiss-input mt-1" type="range" min={0} max={10} step={0.5} value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Corner radius</label>
                <input className="swiss-input mt-1" type="range" min={0} max={64} step={1} value={cornerRadius} onChange={(e) => setCornerRadius(Number(e.target.value))} />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="primary" onClick={applySelectedChanges} title="Apply changes" className="w-full sm:w-auto">
              Apply
            </Button>
            <Button type="button" onClick={removeSelectedField} title="Delete selected" className="w-full sm:w-auto">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
