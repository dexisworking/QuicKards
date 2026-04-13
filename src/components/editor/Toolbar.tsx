"use client";

import { Download, Eye, Save, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type ToolbarProps = {
  name: string;
  setName: (value: string) => void;
  onSave: () => void;
  onPreviewToggle: () => void;
  previewMode: boolean;
  busy: boolean;
};

export const EditorToolbar = ({ name, setName, onSave, onPreviewToggle, previewMode, busy }: ToolbarProps) => {
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-zinc-300 bg-[var(--surface)]/95 p-3 backdrop-blur">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="swiss-input min-w-[200px] max-w-[360px]"
        aria-label="Template name"
      />
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" onClick={onPreviewToggle} title="Toggle preview">
          <Eye className="mr-1 h-4 w-4" />
          {previewMode ? "Edit mode" : "Preview"}
        </Button>
        <Button type="button" variant="ghost" disabled title="Generate in project workspace">
          <WandSparkles className="mr-1 h-4 w-4" />
          Generate
        </Button>
        <Button type="button" variant="ghost" disabled title="Export from project jobs">
          <Download className="mr-1 h-4 w-4" />
          Export
        </Button>
        <Button type="button" variant="primary" onClick={onSave} disabled={busy} title="Save template">
          <Save className="mr-1 h-4 w-4" />
          {busy ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
};
