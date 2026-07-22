// ============================================
// QUICKARDS — Billing persistence
// ============================================
//
// Webhook processing cannot start with an OrgScope because Razorpay is the
// caller. This narrow database module records an event idempotently first,
// then projects only the signed subscription payload into an organization row.

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { currentUsagePeriod, planFor } from "@/lib/billing/plans";
import { db } from "./client";
import { billingWebhookEvents, subscriptions, usageCounters } from "./schema/app";

const STATUSES = new Set(["created", "authenticated", "active", "pending", "halted", "cancelled", "completed", "expired"]);

export async function recordBillingWebhook(input: { id: string; event: string; payload: Record<string, unknown> }) {
  const inserted = await db
    .insert(billingWebhookEvents)
    .values({ providerEventId: input.id, event: input.event, payload: input.payload })
    .onConflictDoNothing()
    .returning({ id: billingWebhookEvents.id });
  return inserted.length > 0;
}

export async function applyRazorpaySubscription(input: {
  organizationId: string;
  subscriptionId: string;
  planKey: string;
  razorpayPlanId?: string | null;
  status: string;
  currentStart?: number | null;
  currentEnd?: number | null;
  quantity?: number | null;
}) {
  if (!STATUSES.has(input.status)) return;
  const values = {
    organizationId: input.organizationId,
    planKey: input.planKey,
    razorpaySubscriptionId: input.subscriptionId,
    razorpayPlanId: input.razorpayPlanId ?? null,
    status: input.status as (typeof subscriptions.$inferInsert)["status"],
    currentPeriodStart: input.currentStart ? new Date(input.currentStart * 1000) : null,
    currentPeriodEnd: input.currentEnd ? new Date(input.currentEnd * 1000) : null,
    seats: Math.max(1, input.quantity ?? 1),
    updatedAt: new Date(),
  };
  await db.insert(subscriptions).values(values).onConflictDoUpdate({
    target: subscriptions.razorpaySubscriptionId,
    set: { ...values, organizationId: undefined },
  });
}

export async function subscriptionByRazorpayId(id: string) {
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.razorpaySubscriptionId, id)).limit(1);
  return rows[0] ?? null;
}

// ── Usage enforcement ────────────────────────────────────────────────────────
//
// Limits are only real if something refuses work. These three functions are that
// something: reserve at enqueue, commit on success, release on failure.

/** Statuses that actually entitle an org to a paid plan. Anything else (created,
 *  pending, halted, cancelled, expired) falls back to free — we never grant
 *  entitlements for a subscription that is not currently paying. */
const ENTITLING = ["active", "authenticated", "completed"] as const;

export async function activePlanKey(organizationId: string): Promise<string> {
  const rows = await db
    .select({ planKey: subscriptions.planKey })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        inArray(subscriptions.status, [...ENTITLING]),
      ),
    )
    .orderBy(desc(subscriptions.updatedAt))
    .limit(1);
  return rows[0]?.planKey ?? "free";
}

export type Reservation =
  | { ok: true; planKey: string; limit: number; used: number; reserved: number }
  | { ok: false; planKey: string; planName: string; limit: number; used: number; reserved: number; requested: number };

/**
 * Atomically reserve `count` cards against the org's monthly allowance.
 *
 * The check and the increment are ONE statement on purpose. Reading usage and
 * then writing it would let N concurrent renders each observe `used < limit`
 * and collectively blow past it — the exact bypass the plan called out. The
 * conditional `setWhere` means Postgres itself refuses the update when the
 * reservation would exceed the plan, and we detect that by an empty RETURNING.
 */
export async function reserveCards(organizationId: string, count: number): Promise<Reservation> {
  const planKey = await activePlanKey(organizationId);
  const plan = planFor(planKey);
  const limit = plan.cardsPerPeriod;
  const periodStart = currentUsagePeriod();

  const current = await usageFor(organizationId, periodStart);

  // A single job larger than the whole allowance can never fit; reject before
  // touching the counter (the INSERT path below has no limit predicate).
  if (count > limit) {
    return { ok: false, planKey, planName: plan.name, limit, requested: count, ...current };
  }

  const rows = await db
    .insert(usageCounters)
    .values({ organizationId, periodStart, cardsReserved: count })
    .onConflictDoUpdate({
      target: [usageCounters.organizationId, usageCounters.periodStart],
      set: {
        cardsReserved: sql`${usageCounters.cardsReserved} + ${count}`,
        updatedAt: new Date(),
      },
      setWhere: sql`${usageCounters.cardsRendered} + ${usageCounters.cardsReserved} + ${count} <= ${limit}`,
    })
    .returning({ used: usageCounters.cardsRendered, reserved: usageCounters.cardsReserved });

  if (rows.length === 0) {
    return { ok: false, planKey, planName: plan.name, limit, requested: count, ...current };
  }
  return { ok: true, planKey, limit, used: rows[0].used, reserved: rows[0].reserved };
}

/** Job finished: the reservation becomes actual usage. */
export async function commitReservedCards(organizationId: string, count: number): Promise<void> {
  if (count <= 0) return;
  await db
    .update(usageCounters)
    .set({
      // greatest(0, …) so a double-commit or a mismatched count can never drive
      // the counter negative and hand out free quota.
      cardsReserved: sql`greatest(0, ${usageCounters.cardsReserved} - ${count})`,
      cardsRendered: sql`${usageCounters.cardsRendered} + ${count}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(usageCounters.organizationId, organizationId),
        eq(usageCounters.periodStart, currentUsagePeriod()),
      ),
    );
}

/** Job failed or was never queued: give the allowance back. */
export async function releaseReservedCards(organizationId: string, count: number): Promise<void> {
  if (count <= 0) return;
  await db
    .update(usageCounters)
    .set({
      cardsReserved: sql`greatest(0, ${usageCounters.cardsReserved} - ${count})`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(usageCounters.organizationId, organizationId),
        eq(usageCounters.periodStart, currentUsagePeriod()),
      ),
    );
}

export async function usageFor(
  organizationId: string,
  periodStart = currentUsagePeriod(),
): Promise<{ used: number; reserved: number }> {
  const rows = await db
    .select({ used: usageCounters.cardsRendered, reserved: usageCounters.cardsReserved })
    .from(usageCounters)
    .where(
      and(
        eq(usageCounters.organizationId, organizationId),
        eq(usageCounters.periodStart, periodStart),
      ),
    )
    .limit(1);
  return rows[0] ?? { used: 0, reserved: 0 };
}
