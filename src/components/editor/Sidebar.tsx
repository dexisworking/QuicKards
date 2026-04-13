"use client";

import { useState } from "react";
import { ImageIcon, QrCode, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SidebarProps = {
  widthValue: number;
  heightValue: number;
  onWidthValueChange: (value: number) => void;
  onHeightValueChange: (value: number) => void;
  sizeUnit: "px" | "in";
  setSizeUnit: (value: "px" | "in") => void;
  backgroundUrl: string;
  setBackgroundUrl: (value: string) => void;
  setBackgroundFile: (file: File | null) => void;
  addTextField: () => void;
  addImageField: () => void;
  addQrField: () => void;
};

export const EditorSidebar = ({
  widthValue,
  heightValue,
  onWidthValueChange,
  onHeightValueChange,
  sizeUnit,
  setSizeUnit,
  backgroundUrl,
  setBackgroundUrl,
  setBackgroundFile,
  addTextField,
  addImageField,
  addQrField,
}: SidebarProps) => {
  const [panel, setPanel] = useState<"insert" | "layout" | "background">("insert");

  return (
    <div className="space-y-3">
      <Card className="sticky top-20 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" variant={panel === "insert" ? "primary" : "ghost"} onClick={() => setPanel("insert")} title="Insert panel" className="text-xs">
            Insert
          </Button>
          <Button type="button" variant={panel === "layout" ? "primary" : "ghost"} onClick={() => setPanel("layout")} title="Layout panel" className="text-xs">
            Layout
          </Button>
          <Button type="button" variant={panel === "background" ? "primary" : "ghost"} onClick={() => setPanel("background")} title="Background panel" className="text-xs">
            BG
          </Button>
        </div>

        {panel === "insert" ? (
          <div>
            <p className="swiss-kicker">Insert fields</p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <Button type="button" fullWidth onClick={addTextField} title="Add text field">
                <Type className="mr-2 h-4 w-4" /> Add text field
              </Button>
              <Button type="button" fullWidth onClick={addImageField} title="Add image field">
                <ImageIcon className="mr-2 h-4 w-4" /> Add image field
              </Button>
              <Button type="button" fullWidth onClick={addQrField} title="Add QR field">
                <QrCode className="mr-2 h-4 w-4" /> Add QR field
              </Button>
            </div>
          </div>
        ) : null}

        {panel === "layout" ? (
          <div>
            <p className="swiss-kicker">Template settings</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                className="swiss-input"
                type="number"
                min={sizeUnit === "px" ? 100 : 0.5}
                step={sizeUnit === "px" ? 1 : 0.01}
                value={Number.isFinite(widthValue) ? widthValue : ""}
                onChange={(e) => onWidthValueChange(Number(e.target.value))}
                aria-label="Template width"
                placeholder="Width"
              />
              <input
                className="swiss-input"
                type="number"
                min={sizeUnit === "px" ? 100 : 0.5}
                step={sizeUnit === "px" ? 1 : 0.01}
                value={Number.isFinite(heightValue) ? heightValue : ""}
                onChange={(e) => onHeightValueChange(Number(e.target.value))}
                aria-label="Template height"
                placeholder="Height"
              />
            </div>
            <div className="mt-2">
              <label className="text-xs text-zinc-500">Size unit</label>
              <select className="swiss-select mt-1" value={sizeUnit} onChange={(event) => setSizeUnit(event.target.value as "px" | "in")}>
                <option value="px">Pixels (px)</option>
                <option value="in">Inches (in)</option>
              </select>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Switch units anytime. Canvas keeps accurate dimensions while values convert automatically.</p>
          </div>
        ) : null}

        {panel === "background" ? (
          <div>
            <p className="swiss-kicker">Background</p>
            <input
              value={backgroundUrl}
              onChange={(event) => setBackgroundUrl(event.target.value)}
              placeholder="Image URL"
              className="swiss-input mt-3"
            />
            <input className="swiss-file mt-2" type="file" accept="image/*" onChange={(event) => setBackgroundFile(event.target.files?.[0] ?? null)} />
          </div>
        ) : null}
      </Card>
    </div>
  );
};
