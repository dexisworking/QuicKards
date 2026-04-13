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
  align: "left" | "center" | "right";
  setAlign: (value: "left" | "center" | "right") => void;
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
  align,
  setAlign,
  applySelectedChanges,
  removeSelectedField,
}: PropertiesProps) => {
  return (
    <Card className="h-full xl:sticky xl:top-20">
      <p className="swiss-kicker">Properties</p>
      {!selectedObject ? (
        <p className="mt-2 text-sm text-zinc-500">Select an element on canvas to edit its properties.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs text-zinc-500">Field name</label>
            <input className="swiss-input mt-1" value={fieldName} onChange={(event) => setFieldName(event.target.value)} />
          </div>
          {selectedObject.type === "textbox" ? (
            <>
              <div>
                <label className="text-xs text-zinc-500">Font size</label>
                <input className="swiss-input mt-1" type="range" min={8} max={96} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Text color</label>
                <input className="mt-1 h-10 w-full rounded-lg border border-zinc-300" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
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
              <select className="swiss-select" defaultValue="cover">
                <option value="cover">Fit mode: cover</option>
                <option value="contain">Fit mode: contain</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                <input type="checkbox" className="h-4 w-4" defaultChecked />
                Show border
              </label>
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
