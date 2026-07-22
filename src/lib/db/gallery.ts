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

/**
 * Insert the built-in starters once per process, so a fresh environment has a
 * gallery without a manual seed step.
 *
 * Two things this must NOT do, both learned the hard way:
 *
 *  - It must never fail a caller. Seeding is a convenience; if the database is
 *    briefly unreachable the gallery should still render whatever rows exist
 *    (possibly none) rather than 500. This previously broke a production BUILD,
 *    because the page was statically prerendered and the insert ran at build
 *    time against a live database.
 *  - It must never cache a rejection. The memoised promise used to retain a
 *    failure for the lifetime of the process, so a single transient blip
 *    permanently disabled the gallery until redeploy. On failure the handle is
 *    cleared so the next request retries.
 */
async function ensureStarterTemplates() {
  bootstrapPromise ??= db
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
    .then(() => undefined)
    .catch((error) => {
      bootstrapPromise = null; // allow a retry on the next request
      console.warn("[gallery] starter seeding skipped:", error);
    });

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
