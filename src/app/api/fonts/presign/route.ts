// ============================================
// QUICKARDS — Custom font upload presigning
// ============================================
//
// Font bytes go directly from the browser to R2. The DB row is created with
// the stable id used in a document FontRef, so server rendering can resolve
// precisely the same uploaded bytes later.

import { z } from "zod";

import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";
import { errorResponse } from "@/lib/http/errors";
import { fontExt, keys } from "@/lib/storage/keys";
import { presignUpload } from "@/lib/storage/presign";

export const runtime = "nodejs";
const Upload = z.object({ name: z.string().trim().min(1).max(120), family: z.string().trim().min(1).max(120), filename: z.string().min(1), weight: z.number().int().min(100).max(900).default(400), style: z.enum(["normal", "italic"]).default("normal"), byteSize: z.number().int().positive().max(20_000_000) });

export async function POST(request: Request) {
  try {
    const body = Upload.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "Provide a valid TTF or OTF font" }, { status: 400 });
    const ext = fontExt(body.data.filename);
    if (!["ttf", "otf"].includes(ext)) return Response.json({ error: "Only TTF and OTF fonts are supported" }, { status: 400 });
    const scope = await requireOrgScope();
    const id = crypto.randomUUID(); const r2Key = keys.font(scope.organizationId, id, ext);
    await scoped(scope).fonts.create({ id, name: body.data.name, family: body.data.family, weight: body.data.weight, style: body.data.style, r2Key });
    const upload = await presignUpload(r2Key, ext === "otf" ? "font/otf" : "font/ttf");
    return Response.json({ fontId: id, ...upload }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
