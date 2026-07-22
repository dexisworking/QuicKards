// ============================================
// QUICKARDS — Photo ZIP ingest
// ============================================
//
// POST a ZIP of card photos as multipart `file`. Each image is matched to a
// card by filename (photos/EMP001.jpg -> EMP001), uploaded to R2, and recorded
// as an asset. Non-images and unmatched entries are counted, not silently
// dropped.

import { ingestZip } from "@/lib/ingest/service";
import { requireOrgScope } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http/errors";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const scope = await requireOrgScope();

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Missing ZIP file (multipart field `file`)" }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await ingestZip(scope, id, bytes);

    if (result.imported === 0) {
      return Response.json(
        { error: "No importable photos in the ZIP", skipped: result.skipped },
        { status: 400 },
      );
    }

    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
