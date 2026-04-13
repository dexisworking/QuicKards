"use client";

import { ImageIcon, QrCode, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SidebarProps = {
  width: number;
  height: number;
  setWidth: (value: number) => void;
  setHeight: (value: number) => void;
  backgroundUrl: string;
  setBackgroundUrl: (value: string) => void;
  setBackgroundFile: (file: File | null) => void;
  addTextField: () => void;
  addImageField: () => void;
  addQrField: () => void;
};

export const EditorSidebar = ({
  width,
  height,
  setWidth,
  setHeight,
  backgroundUrl,
  setBackgroundUrl,
  setBackgroundFile,
  addTextField,
  addImageField,
  addQrField,
}: SidebarProps) => {
  return (
    <div className="space-y-3">
      <Card className="sticky top-20">
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
      </Card>

      <Card>
        <p className="swiss-kicker">Template settings</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            className="swiss-input"
            type="number"
            min={100}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            aria-label="Template width"
            placeholder="Width"
          />
          <input
            className="swiss-input"
            type="number"
            min={100}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            aria-label="Template height"
            placeholder="Height"
          />
        </div>
      </Card>

      <Card>
        <p className="swiss-kicker">Background</p>
        <input
          value={backgroundUrl}
          onChange={(event) => setBackgroundUrl(event.target.value)}
          placeholder="Image URL"
          className="swiss-input mt-3"
        />
        <input className="swiss-file mt-2" type="file" accept="image/*" onChange={(event) => setBackgroundFile(event.target.files?.[0] ?? null)} />
      </Card>
    </div>
  );
};
