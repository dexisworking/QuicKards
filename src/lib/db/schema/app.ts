// ============================================
// QUICKARDS — Application schema
// ============================================
//
// Tenancy: `organizationId` on every row, cascading from Better Auth's
// `organization` table. Deleting an org removes everything it owns in one
// statement. v1 had NO cascades at all (`records.ts`) and leaked orphaned
// rows and storage files on every single delete.
//
// Blobs deliberately do NOT cascade — Postgres cannot delete an R2 object. The
// other half of that fix is `storageReapQueue` below, drained by a cron.
//
// Column names are spelled snake_case explicitly rather than relying on a
// global casing override, so this file and Better Auth's generated `auth.ts`
// never disagree about naming.

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { CardDocument } from "@/lib/design/schema";
import type { RenderWarning } from "@/lib/design/render/ir";
import { organization, user } from "./auth";

// ── Enums ───────────────────────────────────────────────────────────────────

export const projectStatus = pgEnum("project_status", [
  "draft",
  "data_uploaded",
  "images_uploaded",
  "rendering",
  "rendered",
  "failed",
]);

export const jobStatus = pgEnum("job_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const assetKind = pgEnum("asset_kind", [
  "card_photo",
  "background",
  "font",
  "render_output",
  "gallery_thumb",
]);

export const fontStyle = pgEnum("font_style", ["normal", "italic"]);

/** Razorpay owns the remote lifecycle; this records the normalized local state
 * used by product entitlements without coupling usage enforcement to a live
 * payment-provider request. */
export const subscriptionStatus = pgEnum("subscription_status", [
  "created",
  "authenticated",
  "active",
  "pending",
  "halted",
  "cancelled",
  "completed",
  "expired",
]);

// ── Shared column helpers ───────────────────────────────────────────────────

const ts = (name: string) => timestamp(name, { withTimezone: true });

/** Org FK that cascades — the tenancy backbone. */
const orgId = () =>
  text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" });

/** Creator FK that nulls on user deletion, so removing a person never deletes
 *  their team's work — only its attribution. */
const creatorId = () =>
  text("created_by_user_id").references(() => user.id, { onDelete: "set null" });

// ── Templates & versioned documents ─────────────────────────────────────────

export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    createdByUserId: creatorId(),
    name: text("name").notNull(),
    /** Head pointer into design_versions. Left as a plain uuid rather than a
     *  hard FK: templates and design_versions reference each other, and a
     *  circular FK cannot be created in one migration. The FK is added in a
     *  follow-up migration; app code keeps this pointed at a real version. */
    currentVersionId: uuid("current_version_id"),
    /** When forked from a gallery starter — for "based on" attribution. */
    galleryTemplateId: uuid("gallery_template_id"),
    thumbnailKey: text("thumbnail_key"),
    archivedAt: ts("archived_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("templates_org_updated_idx").on(t.organizationId, t.updatedAt.desc())],
);

export const designVersions = pgTable(
  "design_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    /** Monotonic per template. A render pins the exact version it ran against
     *  (see jobs.designVersionId), so editing mid-render is safe. */
    version: integer("version").notNull(),
    document: jsonb("document").$type<CardDocument>().notNull(),
    createdByUserId: creatorId(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("design_versions_template_version_idx").on(t.templateId, t.version)],
);

// ── Projects (a batch: template + rows + photos + renders) ───────────────────

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    createdByUserId: creatorId(),
    templateId: uuid("template_id").references(() => templates.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    status: projectStatus("status").notNull().default("draft"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("projects_org_updated_idx").on(t.organizationId, t.updatedAt.desc())],
);

// ── Card data (the merged CSV rows) ──────────────────────────────────────────

export const cardData = pgTable(
  "card_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** The mandatory primary key from the CSV — preserved from v1 semantics. */
    cardId: text("card_id").notNull(),
    /** Original row order, so output can be sequenced as the user uploaded it. */
    rowIndex: integer("row_index").notNull(),
    data: jsonb("data").$type<Record<string, string>>().notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    // The upsert target: re-uploading a CSV updates rows by (project, card_id)
    // rather than duplicating them. Exactly v1's behaviour, now enforced by a
    // real unique index instead of a per-row read loop.
    uniqueIndex("card_data_project_card_idx").on(t.projectId, t.cardId),
    // GIN over the row, so "which cards are missing a photo column" style
    // queries do not table-scan a 5,000-row project.
    index("card_data_data_gin").using("gin", t.data),
  ],
);

// ── Assets (blobs in R2; rows are pointers) ──────────────────────────────────

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    /** Null for org-level assets (uploaded fonts, gallery thumbs). */
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    /** For per-card photos, matched from the ZIP filename. Null otherwise. */
    cardId: text("card_id"),
    kind: assetKind("kind").notNull(),
    /** The R2 object key. The bytes live in R2; this is the only pointer, which
     *  is why deleting this row must also enqueue a storageReapQueue entry. */
    r2Key: text("r2_key").notNull(),
    contentType: text("content_type"),
    byteSize: bigint("byte_size", { mode: "number" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("assets_project_idx").on(t.projectId),
    // One photo per card per project — v1's composite uniqueness, preserved.
    uniqueIndex("assets_project_card_idx")
      .on(t.projectId, t.cardId)
      .where(sql`${t.cardId} is not null`),
  ],
);

// ── Fonts (uploaded custom fonts) ────────────────────────────────────────────

export const fonts = pgTable(
  "fonts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    createdByUserId: creatorId(),
    /** Display name shown in the font picker. */
    name: text("name").notNull(),
    /** The CSS family the document references. Unlike v1 — which minted an
     *  opaque `CustomFont_<uuid>` and baked it into template JSON — this is a
     *  real, human family name the renderer resolves by. */
    family: text("family").notNull(),
    weight: integer("weight").notNull().default(400),
    style: fontStyle("style").notNull().default("normal"),
    r2Key: text("r2_key").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("fonts_org_idx").on(t.organizationId)],
);

// ── Jobs (a render run) ──────────────────────────────────────────────────────

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** The pinned design version this job renders — snapshotted at enqueue so
     *  editing the template mid-render cannot change the output. */
    designVersionId: uuid("design_version_id")
      .notNull()
      .references(() => designVersions.id, { onDelete: "restrict" }),
    status: jobStatus("status").notNull().default("queued"),
    /** Cards finished / total, for the progress UI. */
    progress: integer("progress").notNull().default(0),
    total: integer("total").notNull().default(0),
    outputR2Key: text("output_r2_key"),
    /** RenderWarning[] — the substituted-font / missing-image / overflow report
     *  that replaces v1's silent degradation. Surfaced in the UI on completion. */
    warnings: jsonb("warnings").$type<RenderWarning[]>().notNull().default([]),
    error: text("error"),
    createdAt: ts("created_at").notNull().defaultNow(),
    completedAt: ts("completed_at"),
  },
  (t) => [index("jobs_project_created_idx").on(t.projectId, t.createdAt.desc())],
);

// ── Usage counters (billing enforcement) ─────────────────────────────────────

export const usageCounters = pgTable(
  "usage_counters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    /** First day of the billing period this row counts, as a date string. */
    periodStart: text("period_start").notNull(),
    /** Cards actually rendered and delivered. */
    cardsRendered: integer("cards_rendered").notNull().default(0),
    /** Cards RESERVED by in-flight jobs. The reserve-at-enqueue counter that
     *  stops N concurrent renders from each passing a `used < limit` check and
     *  collectively blowing the plan limit. Reconciled on job completion. */
    cardsReserved: integer("cards_reserved").notNull().default(0),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("usage_org_period_idx").on(t.organizationId, t.periodStart)],
);

// ── Billing (organization subscriptions, never user subscriptions) ─────────

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    /** Code-defined tier key; limits live in lib/billing/plans.ts. */
    planKey: text("plan_key").notNull().default("free"),
    razorpaySubscriptionId: text("razorpay_subscription_id").unique(),
    razorpayPlanId: text("razorpay_plan_id"),
    status: subscriptionStatus("status").notNull().default("created"),
    currentPeriodStart: ts("current_period_start"),
    currentPeriodEnd: ts("current_period_end"),
    seats: integer("seats").notNull().default(1),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("subscriptions_org_status_idx").on(t.organizationId, t.status)],
);

/** Razorpay retries webhook delivery. Persisting the provider event id before
 * processing makes the entire subscription projection idempotent. */
export const billingWebhookEvents = pgTable(
  "billing_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerEventId: text("provider_event_id").notNull(),
    event: text("event").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    receivedAt: ts("received_at").notNull().defaultNow(),
    processedAt: ts("processed_at"),
  },
  (t) => [uniqueIndex("billing_webhook_event_id_idx").on(t.providerEventId)],
);

// ── Gallery (public starter templates) ───────────────────────────────────────

export const galleryTemplates = pgTable(
  "gallery_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** URL slug — each gallery entry is an indexable marketing page. */
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    document: jsonb("document").$type<CardDocument>().notNull(),
    thumbnailKey: text("thumbnail_key"),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("gallery_slug_idx").on(t.slug)],
);

// ── Storage reap queue (blob GC) ─────────────────────────────────────────────

export const storageReapQueue = pgTable(
  "storage_reap_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** The R2 object to delete. Populated when a row pointing at it is deleted
     *  — cascades handle the Postgres side, this handles the blob side. */
    r2Key: text("r2_key").notNull(),
    reason: text("reason"),
    enqueuedAt: ts("enqueued_at").notNull().defaultNow(),
    processedAt: ts("processed_at"),
  },
  (t) => [index("reap_unprocessed_idx").on(t.enqueuedAt).where(sql`${t.processedAt} is null`)],
);
