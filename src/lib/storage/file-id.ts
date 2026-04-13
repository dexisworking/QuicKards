export const encodeFileId = (path: string): string => {
  return Buffer.from(path, "utf8").toString("base64url");
};

export const decodeFileId = (fileId: string): string => {
  return Buffer.from(fileId, "base64url").toString("utf8");
};
