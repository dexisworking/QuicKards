// ============================================
// QUICKARDS — Render pipeline integration test (LIVE Neon + R2 + resvg)
// ============================================
//
// THE Phase 5 milestone: a real design + CSV + photos becomes a PDF/ZIP in R2,
// through the same shared renderer the editor uses. At green, v2 is at v1
// feature-parity, headless.
//
// Gated behind QUICKARDS_INTEGRATION=1. Run:
//   QUICKARDS_INTEGRATION=1 npx vitest run pipeline.integration

import { config } from "dotenv";
config({ path: ".env.local", override: true }); // see nextjs16-gotchas: vitest mangles DATABASE_URL

import { existsSync, readFileSync } from "node:fs";

import { neon } from "@neondatabase/serverless";
import JSZip from "jszip";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { scoped, type OrgScope } from "@/lib/db/scope";
import { CardDocument, emptyDocument, newId } from "@/lib/design/schema";
import { ingestCsvRows } from "@/lib/ingest/service";
import { ingestZip } from "@/lib/ingest/service";
import { keys } from "@/lib/storage/keys";
import { deleteObjects, getObject, listPrefix, putObject } from "@/lib/storage/r2";
import { renderJobInline } from "./pipeline";

const RUN = process.env.QUICKARDS_INTEGRATION === "1";
const SYSTEM_FONT = "C:/Windows/Fonts/arial.ttf";
const hasFont = existsSync(SYSTEM_FONT);

describe.runIf(RUN)("render pipeline (live Neon + R2 + resvg)", () => {
  const sql = neon(process.env.DATABASE_URL!);
  const stamp = Date.now();
  const userId = `rtest-user-${stamp}`;
  const orgId = `rtest-org-${stamp}`;
  const scope: OrgScope = { organizationId: orgId, userId, role: "owner" };
  const repo = scoped(scope);

  let projectId: string;
  let versionId: string;
  let jobId: string;
  let gallerySlug: string | undefined;
  let galleryJobId: string | undefined;

  const photo = (r: number, g: number, b: number) =>
    sharp({ create: { width: 120, height: 120, channels: 3, background: { r, g, b } } })
      .png()
      .toBuffer();

  beforeAll(async () => {
    await sql`insert into "user"(id, name, email, email_verified, created_at, updated_at)
      values(${userId}, 'rtest', ${`rtest-${stamp}@quickards.test`}, false, now(), now())`;
    await sql`insert into organization(id, name, slug, created_at)
      values(${orgId}, 'rtest org', ${`rtest-${stamp}`}, now())`;
    await sql`insert into member(id, organization_id, user_id, role, created_at)
      values(${`rtest-m-${stamp}`}, ${orgId}, ${userId}, 'owner', now())`;

    // Optional custom font: upload to R2 + a fonts row, so text actually renders.
    let fontId: string | undefined;
    if (hasFont) {
      fontId = crypto.randomUUID();
      const key = keys.font(orgId, fontId, "ttf");
      await putObject(key, readFileSync(SYSTEM_FONT), "font/ttf");
      await sql`insert into fonts(id, organization_id, name, family, weight, style, r2_key, created_at)
        values(${fontId}, ${orgId}, 'Arial', 'Arial', 400, 'normal', ${key}, now())`;

      gallerySlug = `rtest-gallery-${stamp}`;
      const galleryDocument = buildDocument(fontId);
      await sql`insert into gallery_templates(id, slug, name, category, document, is_published, created_at)
        values(${crypto.randomUUID()}, ${gallerySlug}, 'Student ID', 'Student ID', ${galleryDocument}, true, now())`;
    }

    const document = buildDocument(fontId);
    const created = await repo.templates.create({ name: "rtest template", document });
    versionId = created.versionId;

    projectId = await repo.projects.create({ name: "rtest project", templateId: created.templateId });

    await ingestCsvRows(scope, projectId, [
      { card_id: "EMP001", name: "Jane Doe" },
      { card_id: "EMP002", name: "John Roe" },
    ]);

    const zip = new JSZip();
    zip.file("EMP001.png", await photo(200, 60, 60));
    zip.file("EMP002.png", await photo(60, 60, 200));
    await ingestZip(scope, projectId, await zip.generateAsync({ type: "uint8array" }));

    jobId = await repo.jobs.create({ projectId, designVersionId: versionId, total: 2 });

    if (hasFont && gallerySlug) {
      const forked = await repo.templates.createFromGallery({ slug: gallerySlug });
      const forkProjectId = await repo.projects.create({ name: "rtest gallery project", templateId: forked.templateId });
      await ingestCsvRows(scope, forkProjectId, [{ card_id: "G001", name: "Gallery User" }]);
      galleryJobId = await repo.jobs.create({ projectId: forkProjectId, designVersionId: forked.versionId, total: 1 });
    }
  }, 60_000);

  afterAll(async () => {
    const objects = await listPrefix(keys.orgPrefix(orgId)).catch(() => []);
    if (objects.length) await deleteObjects(objects).catch(() => {});
    if (gallerySlug) await sql`delete from gallery_templates where slug = ${gallerySlug}`;
    await sql`delete from organization where id = ${orgId}`;
    await sql`delete from "user" where id = ${userId}`;
  });

  it("renders every card and assembles a PDF + ZIP in R2", async () => {
    const result = await renderJobInline(orgId, jobId);
    expect(result.cardCount).toBe(2);

    // Job marked complete with an output pointer and full progress.
    const [job] = await sql`select status, progress, output_r2_key from jobs where id = ${jobId}`;
    expect(job.status).toBe("completed");
    expect(job.progress).toBe(2);
    expect(job.output_r2_key).toBe(result.outputKey);

    // The output ZIP exists in R2 and contains one PNG per card + the PDF.
    const zipBytes = await getObject(result.outputKey);
    expect(zipBytes).not.toBeNull();

    const zip = await JSZip.loadAsync(zipBytes!);
    const names = Object.keys(zip.files);
    expect(names).toContain("cards/EMP001.png");
    expect(names).toContain("cards/EMP002.png");
    expect(names).toContain("combined.pdf");

    // The card PNGs are real PNGs.
    const cardPng = await zip.files["cards/EMP001.png"].async("uint8array");
    expect(Buffer.from(cardPng.subarray(0, 8))).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );

    // The combined PDF is a real PDF with content.
    const pdf = await zip.files["combined.pdf"].async("uint8array");
    expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(1000);
  }, 60_000);

  it("reports no missing-font warnings when the font is supplied", async () => {
    if (!hasFont) return; // font-fidelity assertion only when a real font exists
    const [job] = await sql`select warnings from jobs where id = ${jobId}`;
    const warnings = job.warnings as Array<{ kind: string }>;
    expect(warnings.filter((w) => w.kind === "font-missing")).toEqual([]);
  });

  it("renders a gallery-forked template that references a custom font", async () => {
    if (!hasFont || !galleryJobId) return;
    const result = await renderJobInline(orgId, galleryJobId);
    expect(result.cardCount).toBe(1);
    expect(result.warnings.filter((w) => w.kind === "font-missing")).toEqual([]);
  });
});

/** A realistic front-of-card: a data-bound name, a column-bound circular photo,
 *  and a QR of the card_id. Exercises text, image, and code nodes together. */
function buildDocument(fontId?: string): CardDocument {
  const base = emptyDocument({ width: 400, height: 250 });
  const family = fontId ? "Arial" : "Inter";

  const children = [
    {
      id: newId(),
      name: "Name",
      locked: false,
      hidden: false,
      shadow: null,
      type: "text" as const,
      content: { source: "column" as const, column: "name", fallback: "" },
      stroke: null,
      transform: { x: 20, y: 20, width: 240, height: 40, rotation: 0, opacity: 1, flipX: false, flipY: false },
      typography: {
        fontFamily: family,
        fontWeight: 400,
        fontStyle: "normal" as const,
        fontSize: 28,
        lineHeight: 1.2,
        letterSpacing: 0,
        textAlign: "left" as const,
        verticalAlign: "top" as const,
        textTransform: "none" as const,
        underline: false,
        color: "#111111",
        autoFit: "shrink" as const,
        minFontSize: 10,
        maxLines: 1,
      },
    },
    {
      id: newId(),
      name: "Photo",
      locked: false,
      hidden: false,
      shadow: null,
      type: "image" as const,
      src: { kind: "column" as const, column: "card_id", fallbackAssetId: null },
      fit: "cover" as const,
      clip: { kind: "ellipse" as const },
      border: null,
      transform: { x: 280, y: 20, width: 100, height: 100, rotation: 0, opacity: 1, flipX: false, flipY: false },
    },
    {
      id: newId(),
      name: "QR",
      locked: false,
      hidden: false,
      shadow: null,
      type: "code" as const,
      symbology: "qr" as const,
      value: { source: "template" as const, pattern: "{{card_id}}", fallback: "" },
      foreground: "#000000",
      background: null,
      errorCorrection: "M" as const,
      quietZone: 0,
      transform: { x: 280, y: 130, width: 100, height: 100, rotation: 0, opacity: 1, flipX: false, flipY: false },
    },
  ];

  const fonts = fontId
    ? [{ family: "Arial", weight: 400, style: "normal" as const, source: { kind: "custom" as const, fontId } }]
    : [];

  return CardDocument.parse({
    ...base,
    fonts,
    sides: [{ ...base.sides[0], background: { kind: "color", color: "#FFFFFF" }, children }],
  });
}
