// ============================================
// QUICKARDS — Data binding controls
// ============================================
//
// The bridge between a design and a spreadsheet. Without this the editor can
// only author static cards, which defeats the entire product: the point is that
// one design renders a thousand different cards.
//
// Mirrors the schema's binding union exactly (see lib/design/schema.ts):
//   static   — the same text on every card
//   column   — one CSV column
//   template — a pattern like "{{first_name}} {{last_name}}"

"use client";

import type { ImageSource, TextBinding } from "@/lib/design/schema";
import { cn } from "@/lib/utils";

const TABS: Array<{ key: TextBinding["source"]; label: string; hint: string }> = [
  { key: "static", label: "Fixed", hint: "The same on every card." },
  { key: "column", label: "Column", hint: "One value per row from your CSV." },
  { key: "template", label: "Pattern", hint: "Combine columns, e.g. {{first}} {{last}}." },
];

function Tabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: TextBinding["source"]) => void;
}) {
  return (
    <div className="flex rounded-[var(--k-radius)] bg-[var(--k-surface-2)] p-0.5">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "flex-1 rounded-[calc(var(--k-radius)-2px)] px-2 py-1 text-[11px] font-medium transition-colors",
            value === tab.key
              ? "bg-[var(--k-surface)] text-[var(--k-text)] shadow-sm"
              : "text-[var(--k-text-muted)] hover:text-[var(--k-text)]",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded border border-[var(--k-border)] bg-[var(--k-bg)] px-2 py-1 text-sm";

/** Binding editor for any text-valued property (text content, code value). */
export function BindingControl({
  label,
  binding,
  onChange,
}: {
  label: string;
  binding: TextBinding;
  onChange: (next: TextBinding) => void;
}) {
  // Carry the visible text across a source switch so the user does not lose
  // what they typed when exploring the options.
  const carried =
    binding.source === "static"
      ? binding.value
      : binding.source === "column"
        ? binding.column
        : binding.pattern;

  const switchTo = (source: TextBinding["source"]) => {
    if (source === binding.source) return;
    if (source === "static") onChange({ source: "static", value: carried });
    else if (source === "column") onChange({ source: "column", column: carried || "full_name", fallback: "" });
    else onChange({ source: "template", pattern: carried || "{{first_name}} {{last_name}}", fallback: "" });
  };

  const hint = TABS.find((tab) => tab.key === binding.source)?.hint;

  return (
    <div className="mt-4">
      <div className="mb-1.5 text-xs font-medium text-[var(--k-text)]">{label}</div>
      <Tabs value={binding.source} onChange={switchTo} />

      {binding.source === "static" && (
        <textarea
          className={cn(inputClass, "min-h-16")}
          value={binding.value}
          onChange={(event) => onChange({ source: "static", value: event.target.value })}
        />
      )}

      {binding.source === "column" && (
        <>
          <input
            className={inputClass}
            value={binding.column}
            placeholder="CSV column, e.g. full_name"
            onChange={(event) => onChange({ ...binding, column: event.target.value })}
          />
          <input
            className={inputClass}
            value={binding.fallback}
            placeholder="Fallback when the cell is empty"
            onChange={(event) => onChange({ ...binding, fallback: event.target.value })}
          />
        </>
      )}

      {binding.source === "template" && (
        <>
          <input
            className={inputClass}
            value={binding.pattern}
            placeholder="{{first_name}} {{last_name}}"
            onChange={(event) => onChange({ ...binding, pattern: event.target.value })}
          />
          <input
            className={inputClass}
            value={binding.fallback}
            placeholder="Fallback when nothing resolves"
            onChange={(event) => onChange({ ...binding, fallback: event.target.value })}
          />
        </>
      )}

      <p className="mt-1.5 text-[11px] leading-4 text-[var(--k-text-faint)]">{hint}</p>
    </div>
  );
}

/** Binding editor for an image node's source. `asset` is preserved when already
 *  set (uploads set it) but is not offered as a manual choice — an asset id is
 *  not something anyone types. */
export function ImageSourceControl({
  src,
  onChange,
}: {
  src: ImageSource;
  onChange: (next: ImageSource) => void;
}) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 text-xs font-medium text-[var(--k-text)]">Photo source</div>
      <div className="flex rounded-[var(--k-radius)] bg-[var(--k-surface-2)] p-0.5">
        {(["column", "url"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() =>
              onChange(
                kind === "column"
                  ? { kind: "column", column: "card_id", fallbackAssetId: null }
                  : { kind: "url", url: "https://" },
              )
            }
            className={cn(
              "flex-1 rounded-[calc(var(--k-radius)-2px)] px-2 py-1 text-[11px] font-medium capitalize transition-colors",
              src.kind === kind
                ? "bg-[var(--k-surface)] text-[var(--k-text)] shadow-sm"
                : "text-[var(--k-text-muted)] hover:text-[var(--k-text)]",
            )}
          >
            {kind === "column" ? "Per card" : "Fixed URL"}
          </button>
        ))}
      </div>

      {src.kind === "column" && (
        <>
          <input
            className={inputClass}
            value={src.column}
            placeholder="Match photos by this column"
            onChange={(event) => onChange({ ...src, column: event.target.value })}
          />
          <p className="mt-1.5 text-[11px] leading-4 text-[var(--k-text-faint)]">
            Photos in your ZIP are matched by filename to this column — e.g.{" "}
            <code>EMP001.jpg</code> → <code>EMP001</code>.
          </p>
        </>
      )}

      {src.kind === "url" && (
        <input
          className={inputClass}
          value={src.url}
          placeholder="https://…"
          onChange={(event) => onChange({ kind: "url", url: event.target.value })}
        />
      )}

      {src.kind === "asset" && (
        <p className="mt-1.5 text-[11px] leading-4 text-[var(--k-text-faint)]">
          Using an uploaded image. Switch above to bind it per card instead.
        </p>
      )}
    </div>
  );
}
