export const safeJson = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};

export const getCardIdFromFilename = (filename: string): string => {
  const normalized = filename.split("\\").pop()?.split("/").pop() ?? filename;
  const base = normalized.includes(".") ? normalized.slice(0, normalized.lastIndexOf(".")) : normalized;
  return base.trim();
};
