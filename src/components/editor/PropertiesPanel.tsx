"use client";

import { useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, ChevronDown, ChevronRight, MousePointer2, Trash2 } from "lucide-react";
import type { fabric } from "fabric";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

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

const Section = ({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
      >
        {title}
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5 pt-2">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

const ColorField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="mb-1 block text-xs text-[var(--muted)]">{label}</label>
    <div className="flex items-center gap-2">
      <div
        className="h-8 w-8 shrink-0 rounded-lg border border-[var(--line)]"
        style={{ background: value }}
      />
      <input
        className="swiss-color-input flex-1"
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  </div>
);

const RangeField = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix = "",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}) => (
  <div>
    <div className="mb-1 flex items-center justify-between">
      <label className="text-xs text-[var(--muted)]">{label}</label>
      <span className="font-mono text-xs text-[var(--muted-2)]">
        {typeof value === "number" && value % 1 !== 0 ? value.toFixed(2) : value}
        {suffix}
      </span>
    </div>
    <input
      className="swiss-input"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </div>
);

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
    <div className="swiss-section h-full overflow-y-auto p-4 xl:sticky xl:top-20">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Properties</p>
        {selectedObject ? (
          <span className="swiss-badge swiss-badge-accent">
            {selectedObject.type === "textbox" ? "Text" : "Shape"}
          </span>
        ) : null}
      </div>

      {!selectedObject ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
            <MousePointer2 className="h-6 w-6 text-[var(--muted-2)]" />
          </div>
          <p className="text-sm text-[var(--muted)]">
            Select an element on the canvas to edit its properties.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Field name */}
          <Section title="Field">
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Name</label>
              <input
                className="swiss-input"
                value={fieldName}
                onChange={(event) => setFieldName(event.target.value)}
              />
            </div>
          </Section>

          {/* Transform */}
          <Section title="Transform">
            <RangeField label="Opacity" value={opacity} onChange={setOpacity} min={0} max={1} step={0.01} suffix="" />
            <RangeField label="Rotation" value={rotation} onChange={setRotation} min={-180} max={180} step={1} suffix="°" />
          </Section>

          {selectedObject.type === "textbox" ? (
            <>
              {/* Typography */}
              <Section title="Typography">
                <RangeField label="Font size" value={fontSize} onChange={setFontSize} min={8} max={96} step={1} suffix="px" />
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Font family</label>
                  <select className="swiss-select" value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}>
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
                <ColorField label="Text color" value={color} onChange={setColor} />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={fontWeight === "bold" ? "primary" : "ghost"}
                    onClick={() => setFontWeight(fontWeight === "bold" ? "normal" : "bold")}
                  >
                    <span className="font-bold">B</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={fontStyle === "italic" ? "primary" : "ghost"}
                    onClick={() => setFontStyle(fontStyle === "italic" ? "normal" : "italic")}
                  >
                    <span className="italic">I</span>
                  </Button>
                </div>
                <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-[var(--accent)]"
                    checked={underline}
                    onChange={(e) => setUnderline(e.target.checked)}
                  />
                  Underline
                </label>
                {/* Alignment */}
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { value: "left" as const, icon: <AlignLeft className="h-4 w-4" /> },
                    { value: "center" as const, icon: <AlignCenter className="h-4 w-4" /> },
                    { value: "right" as const, icon: <AlignRight className="h-4 w-4" /> },
                  ].map((item) => (
                    <Button
                      key={item.value}
                      type="button"
                      size="sm"
                      onClick={() => setAlign(item.value)}
                      variant={align === item.value ? "primary" : "ghost"}
                      title={`Align ${item.value}`}
                    >
                      {item.icon}
                    </Button>
                  ))}
                </div>
              </Section>

              {/* Effects */}
              <Section title="Effects" defaultOpen={false}>
                <RangeField label="Stroke width" value={strokeWidth} onChange={setStrokeWidth} min={0} max={8} step={0.5} suffix="px" />
                <ColorField label="Stroke color" value={strokeColor} onChange={setStrokeColor} />
                <RangeField label="Shadow blur" value={shadowBlur} onChange={setShadowBlur} min={0} max={32} step={1} suffix="px" />
                <ColorField label="Shadow color" value={shadowColor} onChange={setShadowColor} />
              </Section>
            </>
          ) : (
            <Section title="Style">
              <ColorField label="Fill color" value={fillColor} onChange={setFillColor} />
              <ColorField label="Border color" value={borderColor} onChange={setBorderColor} />
              <RangeField label="Border width" value={borderWidth} onChange={setBorderWidth} min={0} max={10} step={0.5} suffix="px" />
              <RangeField label="Corner radius" value={cornerRadius} onChange={setCornerRadius} min={0} max={64} step={1} suffix="px" />
            </Section>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="primary"
              onClick={applySelectedChanges}
              title="Apply changes"
              className="flex-1"
            >
              Apply
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={removeSelectedField}
              title="Delete selected"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
