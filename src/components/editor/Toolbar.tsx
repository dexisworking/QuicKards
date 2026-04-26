"use client";

import { Download, Eye, Pencil, Save, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

type ToolbarProps = {
  name: string;
  setName: (value: string) => void;
  sizeSummary: string;
  onSave: () => void;
  onPreviewToggle: () => void;
  previewMode: boolean;
  busy: boolean;
};

export const EditorToolbar = ({ name, setName, sizeSummary, onSave, onPreviewToggle, previewMode, busy }: ToolbarProps) => {
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-2xl p-3 swiss-glass shadow-sm border border-[var(--line)]">
      {/* Template name */}
      <div className="flex w-full items-center gap-2 md:w-auto">
        <div className="relative flex-1 md:flex-initial">
          <Pencil className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-2)]" />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="swiss-input pl-8 md:min-w-[260px]"
            aria-label="Template name"
          />
        </div>
        <span className="swiss-badge swiss-badge-accent hidden md:inline-flex">{sizeSummary}</span>
      </div>

      {/* Actions */}
      <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 md:ml-auto md:w-auto md:overflow-visible md:pb-0">
        <Tooltip label={previewMode ? "Edit mode" : "Preview"}>
          <Button type="button" variant="ghost" size="sm" onClick={onPreviewToggle} title="Toggle preview" className="shrink-0">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">{previewMode ? "Edit" : "Preview"}</span>
          </Button>
        </Tooltip>

        <Tooltip label="Generate in project workspace">
          <Button type="button" variant="ghost" size="sm" disabled title="Generate in project workspace" className="shrink-0">
            <WandSparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Generate</span>
          </Button>
        </Tooltip>

        <Tooltip label="Export from project jobs">
          <Button type="button" variant="ghost" size="sm" disabled title="Export from project jobs" className="shrink-0">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </Tooltip>

        <Button type="button" variant="primary" onClick={onSave} disabled={busy} title="Save template" className="shrink-0">
          <Save className="h-4 w-4" />
          {busy ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
};
