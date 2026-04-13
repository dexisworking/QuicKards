import Papa from "papaparse";

type CsvRow = Record<string, string>;

export const parseCsvContent = (content: string): CsvRow[] => {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((item) => item.message).join(", "));
  }

  return parsed.data
    .map((row) =>
      Object.entries(row).reduce<CsvRow>((acc, [key, value]) => {
        acc[key] = typeof value === "string" ? value.trim() : "";
        return acc;
      }, {}),
    )
    .filter((row) => Object.values(row).some((value) => value !== ""));
};
