// ============================================
// QUICKARDS — Editor font list
// ============================================
//
// The editor needs names and temporary download URLs, but never raw storage
// keys. The browser fetches font bytes directly from R2 with presigned GETs.

import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";
import { errorResponse } from "@/lib/http/errors";
import { presignDownload } from "@/lib/storage/presign";

export const runtime = "nodejs";

export async function GET() {
  try {
    const fonts = await scoped(await requireOrgScope()).fonts.list();
    const faces = await Promise.all(
      fonts.map(async ({ id, name, family, weight, style, r2Key }) => ({
        id,
        name,
        family,
        weight,
        style,
        href: await presignDownload(r2Key, { expiresIn: 900 }),
      })),
    );
    return Response.json({ fonts: faces });
  } catch (error) { return errorResponse(error); }
}
