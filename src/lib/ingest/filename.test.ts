// ============================================
// QUICKARDS — filename → card_id tests
// ============================================
//
// getCardIdFromFilename is a REGRESSION LOCK on v1 — it decides which photo
// maps to which card.

import { describe, expect, it } from "vitest";

import {
  contentTypeForExtension,
  extensionFromFilename,
  getCardIdFromFilename,
  isImageFilename,
} from "./filename";

describe("getCardIdFromFilename (v1 contract)", () => {
  it("strips a forward-slash directory and the extension", () => {
    expect(getCardIdFromFilename("photos/EMP001.jpg")).toBe("EMP001");
  });

  it("strips a backslash directory", () => {
    expect(getCardIdFromFilename("photos\\EMP002.png")).toBe("EMP002");
  });

  it("strips nested directories", () => {
    expect(getCardIdFromFilename("2026/spring/EMP003.webp")).toBe("EMP003");
  });

  it("handles a filename with no extension", () => {
    expect(getCardIdFromFilename("EMP004")).toBe("EMP004");
  });

  it("keeps interior dots, stripping only the last extension", () => {
    expect(getCardIdFromFilename("EMP.005.jpg")).toBe("EMP.005");
  });

  it("trims surrounding whitespace", () => {
    expect(getCardIdFromFilename("photos/  EMP006  .jpg")).toBe("EMP006");
  });
});

describe("extension & content-type helpers", () => {
  it("extracts a lowercased extension with a fallback", () => {
    expect(extensionFromFilename("a.JPG")).toBe("jpg");
    expect(extensionFromFilename("noext")).toBe("jpg");
    expect(extensionFromFilename("noext", "png")).toBe("png");
  });

  it("maps extensions to content types", () => {
    expect(contentTypeForExtension("png")).toBe("image/png");
    expect(contentTypeForExtension("JPG")).toBe("image/jpeg");
    expect(contentTypeForExtension("mystery")).toBe("application/octet-stream");
  });

  it("recognises image filenames", () => {
    expect(isImageFilename("EMP001.jpg")).toBe(true);
    expect(isImageFilename("README.txt")).toBe(false);
    expect(isImageFilename("Thumbs.db")).toBe(false);
  });
});
