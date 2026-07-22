// ============================================
// QUICKARDS — Organization-scoped repository
// ============================================
//
// The primary tenant-isolation mechanism. Route handlers never touch `db`
// directly (an ESLint rule forbids it outside src/lib/db) — they call
// `scoped(orgScope)` and get query helpers with the organization filter
// already baked in. There is no code path that returns another org's rows,
// because there is no method that omits the filter.
//
// This replaces v1's isolation, which was app-code-only (`ensureProjectAccess`)
// while Appwrite's collection permissions let any authenticated user read any
// row. Here the filter is not a check you can forget to write; it is the only
// way to query at all.
//
// (Postgres RLS was considered and deferred — the Neon HTTP driver runs each
// statement in its own connection, so `set_config('app.org', …)` and the
// SELECT land in different sessions and the policy sees nothing. The repository
// pattern is sufficient when lint-enforced; RLS is revisited in Phase 11.)

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { randomUUID } from "node:crypto";

import type { RenderWarning } from "@/lib/design/render/ir";
import type { CardDocument } from "@/lib/design/schema";
import { db } from "./client";
import {
  assets,
  cardData,
  designVersions,
  fonts,
  jobs,
  projectStatus,
  projects,
  templates,
} from "./schema/app";

export type OrgRole = "owner" | "admin" | "member";

export type ProjectStatus = (typeof projectStatus.enumValues)[number];

export type OrgScope = {
  organizationId: string;
  userId: string;
  role: OrgRole;
};

export function scoped(scope: OrgScope) {
  const inOrg = {
    templates: eq(templates.organizationId, scope.organizationId),
    projects: eq(projects.organizationId, scope.organizationId),
    assets: eq(assets.organizationId, scope.organizationId),
    jobs: eq(jobs.organizationId, scope.organizationId),
    fonts: eq(fonts.organizationId, scope.organizationId),
  };

  /** Confirm a project belongs to this org before touching its child rows.
   *  card_data and assets scope THROUGH the project (they carry no org id of
   *  their own for card_data), so every child mutation gates on this first. */
  async function assertOwnsProject(projectId: string): Promise<void> {
    const rows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), inOrg.projects))
      .limit(1);
    if (rows.length === 0) {
      throw new OrgScopeError(`Project ${projectId} not found in this organization`);
    }
  }

  return {
    templates: {
      list: () =>
        db
          .select()
          .from(templates)
          .where(and(inOrg.templates, isNull(templates.archivedAt)))
          .orderBy(desc(templates.updatedAt)),

      byId: async (id: string) => {
        const rows = await db
          .select()
          .from(templates)
          .where(and(eq(templates.id, id), inOrg.templates))
          .limit(1);
        return rows[0] ?? null;
      },

      /** The editor reads the template and its pinned head together. Keeping
       *  this join in the scoped repository prevents a route from accidentally
       *  loading a version belonging to a different organization. */
      withCurrentDocument: async (id: string) => {
        const rows = await db
          .select({
            id: templates.id,
            name: templates.name,
            updatedAt: templates.updatedAt,
            currentVersionId: templates.currentVersionId,
            version: designVersions.version,
            document: designVersions.document,
          })
          .from(templates)
          .innerJoin(designVersions, eq(designVersions.id, templates.currentVersionId))
          .where(and(eq(templates.id, id), inOrg.templates))
          .limit(1);
        return rows[0] ?? null;
      },

      /** Create a template and its first design version together, pointing the
       *  head at that version. Two inserts rather than a transaction because
       *  the HTTP driver has no interactive transactions — a version orphaned
       *  by a failure between them is harmless (unreferenced) and swept later. */
      create: async (input: { name: string; document: CardDocument }) => {
        const templateId = randomUUID();
        const versionId = randomUUID();

        await db.insert(templates).values({
          id: templateId,
          organizationId: scope.organizationId,
          createdByUserId: scope.userId,
          name: input.name,
          currentVersionId: versionId,
        });

        await db.insert(designVersions).values({
          id: versionId,
          templateId,
          version: 1,
          document: input.document,
          createdByUserId: scope.userId,
        });

        return { templateId, versionId };
      },

      /**
       * Append-only document save with compare-and-swap semantics. A version
       * is never overwritten: renders can retain the old pointer while the
       * editor advances the template head. The conditional head update is the
       * concurrency guard available with Neon's non-interactive HTTP driver.
       */
      updateDocument: async (input: {
        id: string;
        baseVersion: number;
        document: CardDocument;
      }) => {
        const current = await db
          .select({ id: templates.id, versionId: designVersions.id, version: designVersions.version })
          .from(templates)
          .innerJoin(designVersions, eq(designVersions.id, templates.currentVersionId))
          .where(and(eq(templates.id, input.id), inOrg.templates))
          .limit(1);

        const head = current[0];
        if (!head) throw new OrgScopeError(`Template ${input.id} not found in this organization`);
        if (head.version !== input.baseVersion) return { ok: false as const, version: head.version };

        const versionId = randomUUID();
        await db.insert(designVersions).values({
          id: versionId,
          templateId: input.id,
          version: head.version + 1,
          document: input.document,
          createdByUserId: scope.userId,
        });

        const advanced = await db
          .update(templates)
          .set({ currentVersionId: versionId, updatedAt: new Date() })
          .where(
            and(
              eq(templates.id, input.id),
              inOrg.templates,
              eq(templates.currentVersionId, head.versionId),
            ),
          )
          .returning({ id: templates.id });

        // A concurrently saved version won the compare-and-swap. The just
        // inserted version is harmlessly unreferenced and can be reaped later.
        return advanced.length > 0
          ? { ok: true as const, version: head.version + 1, versionId }
          : { ok: false as const, version: head.version };
      },

      rename: (id: string, name: string) =>
        db
          .update(templates)
          .set({ name, updatedAt: new Date() })
          .where(and(eq(templates.id, id), inOrg.templates)),

      archive: (id: string) =>
        db
          .update(templates)
          .set({ archivedAt: new Date() })
          .where(and(eq(templates.id, id), inOrg.templates)),
    },

    designVersions: {
      /** Load a pinned design version, org-checked through its template so a
       *  job cannot render a version belonging to another tenant. */
      byId: async (id: string) => {
        const rows = await db
          .select({
            id: designVersions.id,
            templateId: designVersions.templateId,
            version: designVersions.version,
            document: designVersions.document,
          })
          .from(designVersions)
          .innerJoin(templates, eq(designVersions.templateId, templates.id))
          .where(and(eq(designVersions.id, id), inOrg.templates))
          .limit(1);
        return rows[0] ?? null;
      },
    },

    projects: {
      list: () =>
        db
          .select()
          .from(projects)
          .where(inOrg.projects)
          .orderBy(desc(projects.updatedAt)),

      byId: async (id: string) => {
        const rows = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, id), inOrg.projects))
          .limit(1);
        return rows[0] ?? null;
      },

      create: async (input: { name: string; templateId?: string }) => {
        const id = randomUUID();
        await db.insert(projects).values({
          id,
          organizationId: scope.organizationId,
          createdByUserId: scope.userId,
          name: input.name,
          templateId: input.templateId,
        });
        return id;
      },

      /** Advance the ingest/render status. Org-filtered, so it silently no-ops
       *  on a project outside the org rather than mutating someone else's. */
      setStatus: (id: string, status: ProjectStatus) =>
        db
          .update(projects)
          .set({ status, updatedAt: new Date() })
          .where(and(eq(projects.id, id), inOrg.projects)),
    },

    cardData: {
      /**
       * Batched upsert — the fix for v1's N+1.
       *
       * v1 issued one Appwrite round-trip per row (`data/route.ts:105`), 5,000
       * sequential network calls at the cap. This is one statement per ~1,000
       * rows, with identical semantics: `card_id` is the key, existing rows
       * update, new rows insert. Chunked to stay under Postgres's parameter
       * ceiling (~65k; ~4 params/row keeps a chunk well clear).
       */
      upsertRows: async (
        projectId: string,
        rows: Array<{ cardId: string; data: Record<string, string> }>,
      ) => {
        await assertOwnsProject(projectId);

        const CHUNK = 1000;
        for (let i = 0; i < rows.length; i += CHUNK) {
          const slice = rows.slice(i, i + CHUNK);
          await db
            .insert(cardData)
            .values(
              slice.map((row, j) => ({
                projectId,
                cardId: row.cardId,
                rowIndex: i + j,
                data: row.data,
              })),
            )
            .onConflictDoUpdate({
              target: [cardData.projectId, cardData.cardId],
              set: {
                data: sql`excluded.data`,
                rowIndex: sql`excluded.row_index`,
                updatedAt: sql`now()`,
              },
            });
        }
      },

      forProject: async (projectId: string) => {
        await assertOwnsProject(projectId);
        return db
          .select()
          .from(cardData)
          .where(eq(cardData.projectId, projectId))
          .orderBy(cardData.rowIndex);
      },
    },

    assets: {
      /** Create an org-owned template asset before its direct-to-R2 upload.
       *  The asset id is the stable document reference; the browser only gets
       *  a presigned URL and never receives storage credentials. */
      createTemplateAsset: async (input: {
        id?: string;
        templateId: string;
        r2Key: string;
        contentType: string;
        byteSize?: number;
      }) => {
        const template = await db
          .select({ id: templates.id })
          .from(templates)
          .where(and(eq(templates.id, input.templateId), inOrg.templates))
          .limit(1);
        if (template.length === 0) {
          throw new OrgScopeError(`Template ${input.templateId} not found in this organization`);
        }
        const id = input.id ?? randomUUID();
        await db.insert(assets).values({
          id,
          organizationId: scope.organizationId,
          kind: "background",
          r2Key: input.r2Key,
          contentType: input.contentType,
          byteSize: input.byteSize,
        });
        return id;
      },
      /**
       * Upsert per-card photo pointers, one row per card_id.
       *
       * The R2 key is deterministic per (project, card_id) (see keys.ts), so
       * re-uploading overwrites the same object and the key never changes —
       * which is why the conflict `set` can leave r2_key alone and just refresh
       * the metadata. `targetWhere` is required because the uniqueness index is
       * partial (only where card_id is not null).
       */
      upsertCardPhotos: async (
        projectId: string,
        photos: Array<{ cardId: string; r2Key: string; contentType: string; byteSize: number }>,
      ) => {
        await assertOwnsProject(projectId);
        if (photos.length === 0) return;

        const CHUNK = 1000;
        for (let i = 0; i < photos.length; i += CHUNK) {
          const slice = photos.slice(i, i + CHUNK);
          await db
            .insert(assets)
            .values(
              slice.map((photo) => ({
                organizationId: scope.organizationId,
                projectId,
                cardId: photo.cardId,
                kind: "card_photo" as const,
                r2Key: photo.r2Key,
                contentType: photo.contentType,
                byteSize: photo.byteSize,
              })),
            )
            .onConflictDoUpdate({
              target: [assets.projectId, assets.cardId],
              targetWhere: sql`${assets.cardId} is not null`,
              set: {
                r2Key: sql`excluded.r2_key`,
                contentType: sql`excluded.content_type`,
                byteSize: sql`excluded.byte_size`,
              },
            });
        }
      },

      forProject: async (projectId: string) => {
        await assertOwnsProject(projectId);
        return db.select().from(assets).where(eq(assets.projectId, projectId));
      },

      /** Load specific assets by id (org-filtered) — used by the renderer to
       *  resolve backgrounds and static images a document references directly. */
      byIds: async (ids: string[]) => {
        if (ids.length === 0) return [];
        return db.select().from(assets).where(and(inArray(assets.id, ids), inOrg.assets));
      },
    },

    jobs: {
      byId: async (id: string) => {
        const rows = await db
          .select()
          .from(jobs)
          .where(and(eq(jobs.id, id), inOrg.jobs))
          .limit(1);
        return rows[0] ?? null;
      },

      create: async (input: {
        projectId: string;
        designVersionId: string;
        total: number;
      }) => {
        await assertOwnsProject(input.projectId);
        const id = randomUUID();
        await db.insert(jobs).values({
          id,
          organizationId: scope.organizationId,
          projectId: input.projectId,
          designVersionId: input.designVersionId,
          total: input.total,
        });
        return id;
      },

      setRunning: (id: string) =>
        db
          .update(jobs)
          .set({ status: "running", progress: 0 })
          .where(and(eq(jobs.id, id), inOrg.jobs)),

      /** Increment finished-card count. `sql` so concurrent batch steps add up
       *  atomically rather than clobbering each other's read-modify-write. */
      bumpProgress: (id: string, delta: number) =>
        db
          .update(jobs)
          .set({ progress: sql`${jobs.progress} + ${delta}` })
          .where(and(eq(jobs.id, id), inOrg.jobs)),

      complete: (id: string, output: { outputR2Key: string; warnings: RenderWarning[] }) =>
        db
          .update(jobs)
          .set({
            status: "completed",
            outputR2Key: output.outputR2Key,
            warnings: output.warnings,
            completedAt: new Date(),
          })
          .where(and(eq(jobs.id, id), inOrg.jobs)),

      fail: (id: string, error: string) =>
        db
          .update(jobs)
          .set({ status: "failed", error, completedAt: new Date() })
          .where(and(eq(jobs.id, id), inOrg.jobs)),
    },

    fonts: {
      list: () => db.select().from(fonts).where(inOrg.fonts).orderBy(fonts.name),
    },
  };
}

/** Thrown when a scoped operation targets a row outside the organization.
 *  Route handlers map this to a 404 (not 403) — leaking "this exists but is not
 *  yours" is itself a small information disclosure across tenants. */
export class OrgScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrgScopeError";
  }
}
