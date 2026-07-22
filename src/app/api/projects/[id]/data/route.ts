// ============================================
// QUICKARDS — CSV data ingest
// ============================================
//
// POST a project's card data. Accepts, like v1, three shapes: a multipart
// `file` (CSV), a `csv` text field, or a JSON `{ rows: [...] }` body. card_id
// is mandatory (it is the merge key); rows without it are counted as skipped.

import { MAX_ROWS, parseCsvContent, type CsvRow } from "@/lib/ingest/csv";
import { ingestCsvRows } from "@/lib/ingest/service";
import { requireOrgScope } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http/errors";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const scope = await requireOrgScope();

    const rows = await readRows(request);
    if (rows === null) {
      return Response.json(
        { error: "Provide a CSV file, a `csv` text field, or a `rows` JSON array" },
        { status: 400 },
      );
    }
    if (rows.length > MAX_ROWS) {
      return Response.json(
        { error: `Too many rows (${rows.length}); the limit is ${MAX_ROWS}` },
        { status: 413 },
      );
    }

    const result = await ingestCsvRows(scope, id, rows);
    if (result.imported === 0) {
      return Response.json(
        { error: "No importable rows — every row needs a card_id column" },
        { status: 400 },
      );
    }

    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

/** Returns parsed rows, or null when the request carried none of the three
 *  accepted shapes. */
async function readRows(request: Request): Promise<CsvRow[] | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { rows?: unknown } | null;
    return Array.isArray(body?.rows) ? (body.rows as CsvRow[]) : null;
  }

  const form = await request.formData();
  const file = form.get("file");
  const text = form.get("csv");

  if (file instanceof File) return parseCsvContent(await file.text());
  if (typeof text === "string") return parseCsvContent(text);
  return null;
}
