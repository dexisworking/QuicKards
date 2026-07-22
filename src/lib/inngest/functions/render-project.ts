// ============================================
// QUICKARDS — render-project Inngest function
// ============================================
//
// Orchestrates a batch render as a fan-out over steps. Each step is its own
// serverless invocation with its own timeout, so a 2,000-card job is not one
// giant request — the failure mode v1 could never escape.
//
// Rules that only bite at scale, in production, so they are enforced here:
//   - Steps return R2 KEYS, never PNG buffers. Step output is JSON-serialized
//     and size-capped (~4 MB); returning images blows it.
//   - Per-organization concurrency is capped, so one customer's huge job cannot
//     starve everyone else's.

import type { RenderWarning } from "@/lib/design/render/ir";
import { commitReservedCards, releaseReservedCards } from "@/lib/db/billing";
import { scoped } from "@/lib/db/scope";
import {
  assembleOutput,
  dedupeWarnings,
  loadRenderContext,
  renderCardsToR2,
  type RenderedCard,
} from "@/lib/render/pipeline";
import { inngest, RENDER_REQUESTED, type RenderRequested } from "../client";

/** Cards per step. Sized so a step stays well under the serverless time limit
 *  while keeping the step count (and Inngest overhead) reasonable. */
const BATCH_SIZE = 50;

const systemScope = (organizationId: string) =>
  scoped({ organizationId, userId: "system", role: "owner" as const });

export const renderProject = inngest.createFunction(
  {
    id: "render-project",
    // Inngest v4: the trigger lives in options, and createFunction takes
    // (options, handler) — no separate trigger argument.
    triggers: [{ event: RENDER_REQUESTED }],
    concurrency: [{ key: "event.data.organizationId", limit: 2 }],
    retries: 3,
    onFailure: async ({ event, error }) => {
      // Terminal failure after retries — record it so the UI stops spinning,
      // and give the reserved plan allowance back.
      // The failure event wraps the original at event.data.event.
      const original = (event.data as { event: { data: RenderRequested } }).event;
      const { jobId, organizationId } = original.data;
      const repo = systemScope(organizationId);
      const reserved = (await repo.jobs.byId(jobId))?.total ?? 0;
      await repo.jobs.fail(jobId, error.message);
      await releaseReservedCards(organizationId, reserved);
    },
  },
  async ({ event, step }) => {
    const { jobId, organizationId } = event.data as RenderRequested;
    const repo = systemScope(organizationId);

    // Plan: the ordered card_ids and the canvas size. Small, serializable —
    // safe to hand between steps. The resolver (with materialized fonts) is
    // NOT serializable, so each render step rebuilds its own context instead.
    const plan = await step.run("plan", async () => {
      await repo.jobs.setRunning(jobId);
      const ctx = await loadRenderContext(organizationId, jobId);
      return {
        cardIds: ctx.rows.map((r) => r.cardId),
        canvas: ctx.canvas,
      };
    });

    const batches = chunk(plan.cardIds, BATCH_SIZE);
    const rendered: RenderedCard[] = [];
    const warnings: RenderWarning[] = [];

    for (const [index, cardIds] of batches.entries()) {
      const result = await step.run(`render-batch-${index}`, async () => {
        const ctx = await loadRenderContext(organizationId, jobId, { cardIds });
        return renderCardsToR2(ctx);
      });

      for (const card of result.keys) rendered.push({ cardId: card.cardId, key: card.key });
      warnings.push(...result.warnings);

      // Bump progress in its own step so a retry of the render step does not
      // double-count.
      await step.run(`progress-${index}`, () =>
        repo.jobs.bumpProgress(jobId, result.keys.length).then(() => result.keys.length),
      );
    }

    // Preserve the planned order (batches complete in order here, but be
    // explicit rather than relying on it).
    const order = new Map(plan.cardIds.map((id, i) => [id, i]));
    rendered.sort((a, b) => (order.get(a.cardId) ?? 0) - (order.get(b.cardId) ?? 0));

    const output = await step.run("assemble", () =>
      assembleOutput({ orgId: organizationId, jobId, canvas: plan.canvas }, rendered),
    );

    await step.run("finalize", async () => {
      await repo.jobs.complete(jobId, {
        outputR2Key: output.outputKey,
        warnings: dedupeWarnings(warnings),
      });
      // The enqueue-time reservation becomes actual usage.
      await commitReservedCards(organizationId, plan.cardIds.length);
      return output;
    });

    return { jobId, cards: output.cardCount, outputKey: output.outputKey };
  },
);

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
