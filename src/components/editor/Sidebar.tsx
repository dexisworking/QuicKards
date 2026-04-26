"use client";

import { useState } from "react";
import { ImageIcon, QrCode, Type, Palette, Layout } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

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

const tabs = [
  { key: "insert" as const, label: "Insert", icon: <Type className="h-3.5 w-3.5" /> },
  { key: "layout" as const, label: "Layout", icon: <Layout className="h-3.5 w-3.5" /> },
  { key: "background" as const, label: "BG", icon: <Palette className="h-3.5 w-3.5" /> },
];

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
      <div className="swiss-section sticky top-20 space-y-4 p-4">
        {/* Tab bar */}
        <div className="relative flex rounded-lg bg-[var(--surface-2)] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPanel(tab.key)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                panel === tab.key ? "text-white" : "text-[var(--muted)]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <motion.div
            className="absolute inset-y-1 rounded-md bg-[var(--accent)]"
            style={{ width: `${100 / tabs.length}%` }}
            animate={{
              x: `${tabs.findIndex((t) => t.key === panel) * 100}%`,
            }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        </div>

        {/* Insert panel */}
        {panel === "insert" ? (
          <div className="space-y-3">
            <p className="swiss-kicker">Insert fields</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <Type className="h-5 w-5" />, label: "Text", action: addTextField },
                { icon: <ImageIcon className="h-5 w-5" />, label: "Image", action: addImageField },
                { icon: <QrCode className="h-5 w-5" />, label: "QR", action: addQrField },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--muted)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]"
                >
                  {item.icon}
                  <span className="text-[0.65rem] font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Layout panel */}
        {panel === "layout" ? (
          <div className="space-y-3">
            <p className="swiss-kicker">Template settings</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Width</label>
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
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Height</label>
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
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Size unit</label>
              <select className="swiss-select" value={sizeUnit} onChange={(event) => setSizeUnit(event.target.value as "px" | "in")}>
                <option value="px">Pixels (px)</option>
                <option value="in">Inches (in)</option>
              </select>
            </div>
            <p className="text-xs text-[var(--muted-2)]">
              Switch units anytime. Canvas keeps accurate dimensions while values convert automatically.
            </p>
          </div>
        ) : null}

        {/* Background panel */}
        {panel === "background" ? (
          <div className="space-y-3">
            <p className="swiss-kicker">Background</p>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Image URL</label>
              <input
                value={backgroundUrl}
                onChange={(event) => setBackgroundUrl(event.target.value)}
                placeholder="https://..."
                className="swiss-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Or upload file</label>
              <input
                className="swiss-file"
                type="file"
                accept="image/*"
                onChange={(event) => setBackgroundFile(event.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
