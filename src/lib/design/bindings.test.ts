// ============================================
// QUICKARDS — Binding resolution tests
// ============================================
//
// The `normalizeColumnKey` cases here are a REGRESSION LOCK, not a sanity
// check. That function came verbatim from v1 (`render/engine.ts:30`) and every
// existing user's CSV depends on its exact behaviour. If a change to it makes
// one of these fail, the change is wrong — not the test.

import { describe, expect, it } from "vitest";

import { lookupColumn, normalizeColumnKey, referencedColumns, resolveText } from "./bindings";

describe("normalizeColumnKey (v1 contract)", () => {
  it("lowercases and strips spaces, underscores and hyphens", () => {
    expect(normalizeColumnKey("Full Name")).toBe("fullname");
    expect(normalizeColumnKey("full_name")).toBe("fullname");
    expect(normalizeColumnKey("full-name")).toBe("fullname");
    expect(normalizeColumnKey("FULL NAME")).toBe("fullname");
    expect(normalizeColumnKey("Full   Name")).toBe("fullname");
    expect(normalizeColumnKey("full__name")).toBe("fullname");
    expect(normalizeColumnKey("full -_ name")).toBe("fullname");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeColumnKey("  card_id  ")).toBe("cardid");
    expect(normalizeColumnKey("\tcard id\n")).toBe("cardid");
  });

  it("leaves other punctuation alone — v1 did not strip it", () => {
    // Documented deliberately: `.` and `/` survive normalisation. If someone
    // "improves" this to strip all punctuation, headers that used to be
    // distinct would start colliding.
    expect(normalizeColumnKey("emp.id")).toBe("emp.id");
    expect(normalizeColumnKey("dept/team")).toBe("dept/team");
  });

  it("is idempotent", () => {
    const once = normalizeColumnKey("Employee ID");
    expect(normalizeColumnKey(once)).toBe(once);
  });
});

describe("lookupColumn", () => {
  const row = { "Full Name": "Jane Doe", card_id: "EMP001", empty: "" };

  it("prefers an exact key match", () => {
    expect(lookupColumn(row, "Full Name")).toBe("Jane Doe");
    expect(lookupColumn(row, "card_id")).toBe("EMP001");
  });

  it("falls back to a normalised match", () => {
    expect(lookupColumn(row, "full_name")).toBe("Jane Doe");
    expect(lookupColumn(row, "fullname")).toBe("Jane Doe");
    expect(lookupColumn(row, "FULL-NAME")).toBe("Jane Doe");
    expect(lookupColumn(row, "cardId")).toBe("EMP001");
  });

  it("distinguishes a missing column from an empty value", () => {
    // The one deliberate departure from v1, which returned "" for both and so
    // rendered a typo'd field name as a silently blank card.
    expect(lookupColumn(row, "empty")).toBe("");
    expect(lookupColumn(row, "nope")).toBeUndefined();
  });
});

describe("resolveText", () => {
  const row = { first: "Jane", last: "Doe", card_id: "EMP001" };

  it("returns static content unchanged, row or no row", () => {
    const binding = { source: "static", value: "STAFF" } as const;
    expect(resolveText(binding, row).value).toBe("STAFF");
    expect(resolveText(binding, null).value).toBe("STAFF");
  });

  it("renders a legible placeholder at design time", () => {
    expect(resolveText({ source: "column", column: "first", fallback: "" }, null).value).toBe(
      "{first}",
    );
    expect(
      resolveText({ source: "template", pattern: "{{first}} {{last}}", fallback: "" }, null).value,
    ).toBe("{{first}} {{last}}");
  });

  it("resolves a column binding, reporting misses", () => {
    expect(resolveText({ source: "column", column: "first", fallback: "?" }, row)).toEqual({
      value: "Jane",
      missing: [],
    });
    expect(resolveText({ source: "column", column: "middle", fallback: "?" }, row)).toEqual({
      value: "?",
      missing: ["middle"],
    });
  });

  it("interpolates a template binding", () => {
    expect(
      resolveText({ source: "template", pattern: "{{first}} {{last}}", fallback: "" }, row).value,
    ).toBe("Jane Doe");
    expect(
      resolveText({ source: "template", pattern: "ID: {{card_id}}", fallback: "" }, row).value,
    ).toBe("ID: EMP001");
  });

  it("tolerates whitespace inside pattern tokens", () => {
    expect(
      resolveText({ source: "template", pattern: "{{ first }}", fallback: "" }, row).value,
    ).toBe("Jane");
  });

  it("keeps partial output but reports the missing column", () => {
    const result = resolveText(
      { source: "template", pattern: "{{first}} {{middle}}", fallback: "?" },
      row,
    );
    expect(result.value).toBe("Jane ");
    expect(result.missing).toEqual(["middle"]);
  });

  it("falls back wholesale when a pattern resolves to nothing", () => {
    // "ID: " with no id reads as broken output, so an all-miss pattern uses the
    // fallback rather than painting punctuation on its own.
    const result = resolveText(
      { source: "template", pattern: "{{nope}}", fallback: "—" },
      row,
    );
    expect(result.value).toBe("—");
    expect(result.missing).toEqual(["nope"]);
  });
});

describe("referencedColumns", () => {
  it("lists nothing for static bindings", () => {
    expect(referencedColumns({ source: "static", value: "STAFF" })).toEqual([]);
  });

  it("lists the single column for a column binding", () => {
    expect(referencedColumns({ source: "column", column: "first", fallback: "" })).toEqual([
      "first",
    ]);
  });

  it("lists every token in a pattern, trimmed", () => {
    expect(
      referencedColumns({
        source: "template",
        pattern: "{{first}} {{ last }} ({{card_id}})",
        fallback: "",
      }),
    ).toEqual(["first", "last", "card_id"]);
  });
});
