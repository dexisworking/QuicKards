// ============================================
// QUICKARDS — Editor asset presigning
// ============================================
//
// Browser uploads go straight to R2. We reserve the scoped asset reference
// first, then return only a short-lived PUT URL; credentials and blob bytes
// never traverse the Next route.

import { z } from "zod";

import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";
import { errorResponse } from "@/lib/http/errors";
import { keys, safeExt } from "@/lib/storage/keys";
import { presignUpload } from "@/lib/storage/presign";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const ImageUpload = z.object({ filename: z.string().min(1), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), byteSize: z.number().int().positive().max(20_000_000) });

export async function POST(request: Request, context: Context) {
  try {
    const { id: templateId } = await context.params;
    const body = ImageUpload.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "Use a PNG, JPEG, or WebP under 20 MB" }, { status: 400 });
    const scope = await requireOrgScope();
    const assetId = crypto.randomUUID();
    const ext = safeExt(body.data.filename, new Set(["png", "jpg", "jpeg", "webp"]), "png");
    const r2Key = keys.templateBackground(scope.organizationId, templateId, assetId, ext);
    await scoped(scope).assets.createTemplateAsset({ id: assetId, templateId, r2Key, contentType: body.data.contentType, byteSize: body.data.byteSize });
    const upload = await presignUpload(r2Key, body.data.contentType);
    return Response.json({ assetId, ...upload }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
