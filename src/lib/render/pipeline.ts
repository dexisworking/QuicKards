// ============================================
// QUICKARDS — Render pipeline
// ============================================
//
// SERVER ONLY. The headless core that turns a pinned design version + card
// data + photos into a PDF/ZIP in R2. Written as plain async functions so the
// Inngest function is a thin orchestrator over them and so they can be
// integration-tested directly.
//
// This is where the Phase 1 shared renderer pays off: rendering a card is
// "build the SVG the editor would show, then rasterize it". There is no second
// renderer to drift — the exact bug class v1 lived with.

import { createHash } from "node:crypto";

import { buildDocumentIR } from "@/lib/design/render/build";
import { serializeDocument } from "@/lib/design/render/emit-string";
import type { RenderWarning } from "@/lib/design/render/ir";
import { createServerResolver, type ServerResolver } from "@/lib/design/render/resolver.server";
import type { CardDocument, DesignNode, ImageSource } from "@/lib/design/schema";
import { scoped, type OrgScope } from "@/lib/db/scope";
import { keys } from "@/lib/storage/keys";
import { getObject, putObject } from "@/lib/storage/r2";
import { buildCombinedPdf } from "./pdf";
import { rasterize } from "./rasterize";
import { buildOutputZip, safeEntryName, type ZipEntry } from "./zip";

/** A background render has no session; the org comes from the job. `owner` role
 *  because internal rendering is trusted and reads everything the org owns. */
const systemScope = (organizationId: string): OrgScope => ({
  organizationId,
  userId: "system",
  role: "owner",
});

export type RenderRow = { cardId: string; data: Record<string, string> };

export type RenderContext = {
  orgId: string;
  jobId: string;
  projectId: string;
  document: CardDocument;
  sideId: string;
  rows: RenderRow[];
  resolver: ServerResolver;
  canvas: { width: number; height: number };
};

/** Temp key for one card's PNG, deterministic so a retried batch overwrites. */
export const cardPngKey = (orgId: string, jobId: string, cardId: string) =>
  `org/${orgId}/job/${jobId}/cards/${createHash("sha256").update(cardId).digest("hex").slice(0, 32)}.png`;

/**
 * Load everything a render needs, once, and build the resolver.
 *
 * Fonts and the asset-key maps are assembled here so per-card rendering is pure
 * CPU (build SVG, rasterize) with no further I/O per card beyond the photo the
 * resolver fetches — and photos are cached in the resolver.
 */
export async function loadRenderContext(
  orgId: string,
  jobId: string,
  opts: { cardIds?: string[] } = {},
): Promise<RenderContext> {
  const repo = scoped(systemScope(orgId));

  const job = await repo.jobs.byId(jobId);
  if (!job) throw new Error(`Job ${jobId} not found in org ${orgId}`);

  const version = await repo.designVersions.byId(job.designVersionId);
  if (!version) throw new Error(`Design version ${job.designVersionId} not found`);
  const document = version.document;

  const rowsRaw = await repo.cardData.forProject(job.projectId);
  // A batch step renders only its slice — filter to those card_ids. Loaded in
  // rowIndex order, so the batch keeps the user's intended sequence.
  const wanted = opts.cardIds ? new Set(opts.cardIds) : null;
  const rows: RenderRow[] = rowsRaw
    .filter((r) => (wanted ? wanted.has(r.cardId) : true))
    .map((r) => ({ cardId: r.cardId, data: r.data }));

  // assetId -> r2Key for everything the render can reference: per-card photos
  // plus any background/static images named directly in the document.
  const projectAssets = await repo.assets.forProject(job.projectId);
  const referenced = await repo.assets.byIds(collectAssetIds(document));
  const assetKeyById = new Map<string, string>();
  const cardImages = new Map<string, string>();
  for (const asset of [...projectAssets, ...referenced]) {
    assetKeyById.set(asset.id, asset.r2Key);
    if (asset.kind === "card_photo" && asset.cardId) cardImages.set(asset.cardId, asset.id);
  }

  const fontRows = await repo.fonts.list();
  const fontKeyById = new Map(fontRows.map((f) => [f.id, f.r2Key]));

  const resolver = await createServerResolver(document.fonts, {
    loadAsset: async (assetId) => {
      const key = assetKeyById.get(assetId);
      return key ? getObject(key) : null;
    },
    loadFont: async (fontId) => {
      const key = fontKeyById.get(fontId);
      return key ? getObject(key) : null;
    },
    cardImages,
  });

  return {
    orgId,
    jobId,
    projectId: job.projectId,
    document,
    sideId: document.sides[0].id,
    rows,
    resolver,
    canvas: { width: document.canvas.width, height: document.canvas.height },
  };
}

export type RenderedCard = { cardId: string; key: string };

export type BatchResult = {
  /** Each rendered card and the R2 key of its PNG. Objects (not tuples) so they
   *  survive Inngest's JSON step serialization without widening to string[]. */
  keys: RenderedCard[];
  warnings: RenderWarning[];
};

/**
 * Render a set of cards to PNGs in R2 and return their KEYS — never the bytes.
 *
 * Returning keys is the load-bearing rule for the Inngest fan-out: step output
 * is JSON-serialized and size-capped (~4 MB), so a step that returned PNG
 * buffers would blow that limit at scale, in production, not in dev.
 */
export async function renderCardsToR2(ctx: RenderContext): Promise<BatchResult> {
  const fontPaths = ctx.resolver.fontPaths();
  const out: RenderedCard[] = [];
  const warnings: RenderWarning[] = [];

  for (const row of ctx.rows) {
    const { ir, warnings: cardWarnings } = await buildDocumentIR(ctx.document, {
      sideId: ctx.sideId,
      row: row.data,
      resolver: ctx.resolver,
      mode: "raster",
    });
    warnings.push(...cardWarnings);

    const png = rasterize(serializeDocument(ir), { fontPaths });
    const key = cardPngKey(ctx.orgId, ctx.jobId, row.cardId);
    await putObject(key, png, "image/png");
    out.push({ cardId: row.cardId, key });
  }

  return { keys: out, warnings };
}

/**
 * Download the rendered PNGs, build combined.pdf + a ZIP of everything, and
 * upload the ZIP to R2. Returns the output key.
 *
 * The re-download is the cost of the fan-out — buffers cannot cross Inngest
 * steps. Fine at batch scale; a very large job would stream instead (Phase 11).
 */
export async function assembleOutput(
  params: { orgId: string; jobId: string; canvas: { width: number; height: number } },
  orderedCards: Array<{ cardId: string; key: string }>,
): Promise<{ outputKey: string; cardCount: number }> {
  const pngs: Buffer[] = [];
  const entries: ZipEntry[] = [];

  for (const { cardId, key } of orderedCards) {
    const bytes = await getObject(key);
    if (!bytes) continue;
    const buffer = Buffer.from(bytes);
    pngs.push(buffer);
    entries.push({ name: `cards/${safeEntryName(cardId)}.png`, data: buffer });
  }

  const pdf = await buildCombinedPdf(
    pngs,
    Math.round(params.canvas.width),
    Math.round(params.canvas.height),
  );
  entries.push({ name: "combined.pdf", data: pdf });

  const zip = await buildOutputZip(entries);
  const outputKey = keys.jobOutput(params.orgId, params.jobId);
  await putObject(outputKey, zip, "application/zip");

  return { outputKey, cardCount: pngs.length };
}

/**
 * Run an entire job in-process, updating job state as it goes.
 *
 * Used by the integration test and available as the path for tiny jobs that do
 * not warrant the queue. The Inngest function (functions/render-project.ts)
 * does the same work fanned out across steps for large jobs.
 */
export async function renderJobInline(
  orgId: string,
  jobId: string,
): Promise<{ outputKey: string; cardCount: number; warnings: RenderWarning[] }> {
  const repo = scoped(systemScope(orgId));
  await repo.jobs.setRunning(jobId);

  try {
    const ctx = await loadRenderContext(orgId, jobId);
    const { keys: renderedKeys, warnings } = await renderCardsToR2(ctx);

    const keyByCard = new Map(renderedKeys.map((r) => [r.cardId, r.key]));
    const ordered = ctx.rows
      .map((r) => ({ cardId: r.cardId, key: keyByCard.get(r.cardId) }))
      .filter((x): x is { cardId: string; key: string } => Boolean(x.key));

    const { outputKey, cardCount } = await assembleOutput(
      { orgId, jobId, canvas: ctx.canvas },
      ordered,
    );
    const deduped = dedupeWarnings(warnings);

    await repo.jobs.bumpProgress(jobId, cardCount);
    await repo.jobs.complete(jobId, { outputR2Key: outputKey, warnings: deduped });

    return { outputKey, cardCount, warnings: deduped };
  } catch (error) {
    await repo.jobs.fail(jobId, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/** Collapse identical warnings so a 2,000-card batch reports "font X missing"
 *  once, not 2,000 times. Keyed by everything except nodeId's uniqueness so the
 *  same problem across cards folds together. */
export function dedupeWarnings(warnings: RenderWarning[]): RenderWarning[] {
  const seen = new Map<string, RenderWarning>();
  for (const warning of warnings) {
    const signature = JSON.stringify(warning);
    if (!seen.has(signature)) seen.set(signature, warning);
  }
  return [...seen.values()];
}

/** Every assetId a document references directly (backgrounds, static images and
 *  column-image fallbacks) — so the loader can resolve them alongside photos. */
function collectAssetIds(doc: CardDocument): string[] {
  const ids = new Set<string>();

  const fromSource = (src: ImageSource) => {
    if (src.kind === "asset") ids.add(src.assetId);
    if (src.kind === "column" && src.fallbackAssetId) ids.add(src.fallbackAssetId);
  };

  const walk = (nodes: DesignNode[]) => {
    for (const node of nodes) {
      if (node.type === "image") fromSource(node.src);
      if (node.type === "group") walk(node.children);
    }
  };

  for (const side of doc.sides) {
    if (side.background.kind === "image") fromSource(side.background.src);
    walk(side.children);
  }

  return [...ids];
}
