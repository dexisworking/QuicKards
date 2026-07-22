// ============================================
// QUICKARDS — Public gallery repository
// ============================================
//
// Marketing pages need published starter templates without an authenticated
// organization scope. Keeping this narrow query in lib/db avoids weakening the
// scoped repository used by every private app route.

import { and, asc, eq } from "drizzle-orm";

import { db } from "./client";
import { galleryTemplates } from "./schema/app";
import { STARTER_GALLERY_TEMPLATES } from "@/lib/gallery/starters";

let bootstrapPromise: Promise<void> | null = null;

async function ensureStarterTemplates() {
  if (!bootstrapPromise) {
    bootstrapPromise = db
      .insert(galleryTemplates)
      .values(
        STARTER_GALLERY_TEMPLATES.map((template) => ({
          slug: template.slug,
          name: template.name,
          category: template.category,
          document: template.document,
          isPublished: true,
        })),
      )
      .onConflictDoNothing({ target: galleryTemplates.slug })
      .then(() => undefined);
  }
  await bootstrapPromise;
}

export const gallery = {
  list: async () => {
    await ensureStarterTemplates();
    return db
      .select()
      .from(galleryTemplates)
      .where(eq(galleryTemplates.isPublished, true))
      .orderBy(asc(galleryTemplates.name));
  },
  bySlug: async (slug: string) => {
    await ensureStarterTemplates();
    const rows = await db.select().from(galleryTemplates).where(and(eq(galleryTemplates.slug, slug), eq(galleryTemplates.isPublished, true))).limit(1);
    return rows[0] ?? null;
  },
};
