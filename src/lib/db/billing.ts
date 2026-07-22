// ============================================
// QUICKARDS — Billing persistence
// ============================================
//
// Webhook processing cannot start with an OrgScope because Razorpay is the
// caller. This narrow database module records an event idempotently first,
// then projects only the signed subscription payload into an organization row.

import { eq } from "drizzle-orm";

import { db } from "./client";
import { billingWebhookEvents, subscriptions } from "./schema/app";

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
