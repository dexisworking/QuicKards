// ============================================
// QUICKARDS — ZIP extraction tests
// ============================================
//
// Offline — builds fixture ZIPs in memory with JSZip. No network.

import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { extractImageEntries } from "./zip";

async function makeZip(files: Record<string, string>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content);
  return zip.generateAsync({ type: "uint8array" });
}

describe("extractImageEntries", () => {
  it("maps each image to its card_id", async () => {
    const bytes = await makeZip({ "EMP001.jpg": "a", "photos/EMP002.png": "b" });
    const { entries } = await extractImageEntries(bytes);
    const ids = entries.map((e) => e.cardId).sort();
    expect(ids).toEqual(["EMP001", "EMP002"]);
  });

  it("assigns the right content type", async () => {
    const { entries } = await extractImageEntries(await makeZip({ "EMP001.png": "x" }));
    expect(entries[0].contentType).toBe("image/png");
  });

  it("counts and skips non-image entries", async () => {
    const bytes = await makeZip({ "EMP001.jpg": "a", "README.txt": "notes", "list.csv": "x" });
    const { entries, skipped } = await extractImageEntries(bytes);
    expect(entries).toHaveLength(1);
    expect(skipped.notImage).toBe(2);
  });

  it("ignores __MACOSX and dotfile resource forks", async () => {
    const bytes = await makeZip({
      "EMP001.jpg": "a",
      "__MACOSX/._EMP001.jpg": "junk",
      "photos/._EMP002.jpg": "junk",
    });
    const { entries } = await extractImageEntries(bytes);
    expect(entries.map((e) => e.cardId)).toEqual(["EMP001"]);
  });

  it("dedupes duplicate card_ids, last one winning", async () => {
    const zip = new JSZip();
    zip.file("EMP001.jpg", "first");
    zip.file("dir/EMP001.png", "second");
    const bytes = await zip.generateAsync({ type: "uint8array" });

    const { entries } = await extractImageEntries(bytes);
    expect(entries).toHaveLength(1);
    expect(new TextDecoder().decode(entries[0].bytes)).toBe("second");
  });
});
