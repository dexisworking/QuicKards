// ============================================
// QUICKARDS — Versioned template autosave
// ============================================
//
// The editor supplies the version it loaded. A mismatched head returns 409
// rather than overwriting another browser's changes; each successful save
// appends a design_versions row so queued jobs stay reproducible.

import { z } from "zod";

import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";
import { CardDocument } from "@/lib/design/schema";
import { errorResponse } from "@/lib/http/errors";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };
const SaveDocument = z.object({ baseVersion: z.number().int().positive(), document: CardDocument });

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = SaveDocument.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "Invalid card document" }, { status: 400 });
    const result = await scoped(await requireOrgScope()).templates.updateDocument({ id, ...body.data });
    if (!result.ok) return Response.json({ error: "Template changed elsewhere", version: result.version }, { status: 409 });
    return Response.json({ version: result.version, versionId: result.versionId });
  } catch (error) {
    return errorResponse(error);
  }
}
