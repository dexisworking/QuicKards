import path from "node:path";

export const extensionFromFilename = (filename: string, fallback = "jpg"): string => {
  const extension = path.extname(filename).replace(".", "").toLowerCase();
  return extension || fallback;
};

export const contentTypeForExtension = (extension: string): string => {
  switch (extension.toLowerCase()) {
    case "png":
      return "image/png";
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "pdf":
      return "application/pdf";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
};
