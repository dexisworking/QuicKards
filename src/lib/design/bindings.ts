// ============================================
// QUICKARDS — Binding resolution
// ============================================
//
// Turns a TextBinding plus a CSV row into the string that actually gets
// painted. Isomorphic: the editor calls this to render live previews, and the
// Inngest render function calls it per row.

import type { TextBinding } from "./schema";

/** A CSV row, or null at design time when no row is selected. */
export type RenderRow = Record<string, string> | null;

/**
 * PRESERVED VERBATIM from v1 (`src/lib/render/engine.ts:30`).
 *
 * This is user-visible contract, not an implementation detail. It is why a
 * field named `fullName` matches CSV headers `Full Name`, `full_name` and
 * `full-name` alike. Every existing user's spreadsheet depends on this exact
 * behaviour, and "cleaning it up" — trimming differently, handling camelCase,
 * stripping punctuation — silently breaks imports that worked yesterday.
 *
 * Pinned by tests in `bindings.test.ts`. Do not touch.
 *
 * (Note the `-` sits last in the character class, so it is a literal hyphen
 * rather than a range. Preserved as written.)
 */
export const normalizeColumnKey = (value: string): string =>
  value.trim().toLowerCase().replaceAll(/[\s_-]+/g, "");

/**
 * Look a column up in a row: exact key first, then normalised fuzzy match.
 *
 * Differs from v1's `getRowValue` in exactly one respect: v1 returned `""` for
 * both "column missing" and "column present but empty", which is why a typo in
 * a field name produced a blank card instead of an error. Returning `undefined`
 * for missing lets callers emit a `column-missing` warning while still choosing
 * to render the fallback. The *matching* is identical.
 */
export function lookupColumn(
  row: Record<string, string>,
  column: string,
): string | undefined {
  const direct = row[column];
  if (typeof direct === "string") return direct;

  const want = normalizeColumnKey(column);
  const entry = Object.entries(row).find(([key]) => normalizeColumnKey(key) === want);
  return entry?.[1];
}

export type ResolvedText = {
  value: string;
  /** Columns referenced by the binding that the row did not contain. Drives
   *  the `column-missing` RenderWarning. Empty on the happy path. */
  missing: string[];
};

const PATTERN_TOKEN = /\{\{(.+?)\}\}/g;

/**
 * Resolve a text binding against a row.
 *
 * At design time (`row === null`) bindings render a legible placeholder rather
 * than an empty box — an unbound-looking element on a blank canvas is
 * indistinguishable from a bug, and v1's editor had exactly this problem in
 * reverse: it painted the *field name* as the content, which is why users
 * could not tell design text from data text.
 */
export function resolveText(binding: TextBinding, row: RenderRow): ResolvedText {
  if (binding.source === "static") {
    return { value: binding.value, missing: [] };
  }

  if (row === null) {
    return {
      value: binding.source === "column" ? `{${binding.column}}` : binding.pattern,
      missing: [],
    };
  }

  if (binding.source === "column") {
    const hit = lookupColumn(row, binding.column);
    return hit === undefined
      ? { value: binding.fallback, missing: [binding.column] }
      : { value: hit, missing: [] };
  }

  const missing: string[] = [];
  const value = binding.pattern.replace(PATTERN_TOKEN, (_match, rawColumn: string) => {
    const column = rawColumn.trim();
    const hit = lookupColumn(row, column);
    if (hit === undefined) {
      missing.push(column);
      return "";
    }
    return hit;
  });

  // A pattern that resolved to nothing at all falls back wholesale rather than
  // painting an empty string — "ID: " with no id reads as broken output.
  const collapsed = value.trim().length === 0 && missing.length > 0;
  return { value: collapsed ? binding.fallback : value, missing };
}

/**
 * Every column name a binding references. Used to build the column-mapping UI
 * and to warn, at import time, that a template expects a column the uploaded
 * CSV does not have — before rendering 2,000 cards with a blank name field.
 */
export function referencedColumns(binding: TextBinding): string[] {
  if (binding.source === "static") return [];
  if (binding.source === "column") return [binding.column];

  const out: string[] = [];
  for (const match of binding.pattern.matchAll(PATTERN_TOKEN)) {
    out.push(match[1].trim());
  }
  return out;
}
