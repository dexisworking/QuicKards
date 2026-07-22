// ============================================
// QUICKARDS — CSV ingest tests
// ============================================
//
// parseCsvContent cases are a REGRESSION LOCK on v1 behaviour — every existing
// user's spreadsheet must parse identically.

import { describe, expect, it } from "vitest";

import { detectHeaderCollisions, normalizeRows, parseCsvContent } from "./csv";

describe("parseCsvContent (v1 contract)", () => {
  it("parses with a header row, trimming headers and values", () => {
    const rows = parseCsvContent("card_id , Full Name \nEMP001, Jane Doe \n");
    expect(rows).toEqual([{ card_id: "EMP001", "Full Name": "Jane Doe" }]);
  });

  it("skips fully empty rows", () => {
    const rows = parseCsvContent("card_id,name\nEMP001,Jane\n\n,\nEMP002,John\n");
    expect(rows).toHaveLength(2);
  });

  it("keeps a row that has any non-empty value", () => {
    const rows = parseCsvContent("card_id,name\nEMP001,\n");
    expect(rows).toEqual([{ card_id: "EMP001", name: "" }]);
  });

  it("throws on malformed CSV", () => {
    expect(() => parseCsvContent('a,b\n"unterminated,quote\n')).toThrow();
  });
});

describe("normalizeRows", () => {
  it("keys rows by card_id and keeps the whole row as data", () => {
    const { rows } = normalizeRows([{ card_id: "EMP001", name: "Jane" }]);
    expect(rows).toEqual([{ cardId: "EMP001", data: { card_id: "EMP001", name: "Jane" } }]);
  });

  it("accepts cardId as an alternate spelling", () => {
    const { rows } = normalizeRows([{ cardId: "EMP002", name: "John" }]);
    expect(rows[0].cardId).toBe("EMP002");
  });

  it("trims the card_id", () => {
    const { rows } = normalizeRows([{ card_id: "  EMP003  " }]);
    expect(rows[0].cardId).toBe("EMP003");
  });

  it("drops and counts rows with no card_id", () => {
    const { rows, skippedNoCardId } = normalizeRows([
      { card_id: "EMP001", name: "Jane" },
      { name: "No Id" },
      { card_id: "", name: "Blank Id" },
    ]);
    expect(rows).toHaveLength(1);
    expect(skippedNoCardId).toBe(2);
  });
});

describe("detectHeaderCollisions", () => {
  it("flags headers that normalize to the same key", () => {
    const collisions = detectHeaderCollisions(["Full Name", "full_name", "email"]);
    expect(collisions).toEqual([["Full Name", "full_name"]]);
  });

  it("returns nothing when all headers are distinct", () => {
    expect(detectHeaderCollisions(["card_id", "name", "email"])).toEqual([]);
  });
});
