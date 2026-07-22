// ============================================
// QUICKARDS — Razorpay webhook receiver
// ============================================
//
// The raw request bytes are signed by Razorpay. Verify before parsing, record
// the provider event id first, and no-op retries before updating entitlements.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { applyRazorpaySubscription, recordBillingWebhook } from "@/lib/db/billing";

export const runtime = "nodejs";

type RazorpaySubscription = {
  id?: string; plan_id?: string; status?: string; current_start?: number;
  current_end?: number; quantity?: number; notes?: Record<string, string>;
};

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = request.headers.get("x-razorpay-signature");
  if (!secret || !signature) return Response.json({ error: "Webhook unavailable" }, { status: 503 });

  const raw = await request.text();
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const payload = JSON.parse(raw) as { event?: string; payload?: { subscription?: { entity?: RazorpaySubscription } } };
  const event = payload.event ?? "unknown";
  const eventId = request.headers.get("x-razorpay-event-id") ?? createHash("sha256").update(raw).digest("hex");
  const fresh = await recordBillingWebhook({ id: eventId, event, payload: payload as Record<string, unknown> });
  if (!fresh) return Response.json({ ok: true, duplicate: true });

  const subscription = payload.payload?.subscription?.entity;
  const organizationId = subscription?.notes?.organizationId;
  const planKey = subscription?.notes?.planKey;
  if (subscription?.id && subscription.status && organizationId && planKey) {
    await applyRazorpaySubscription({ organizationId, subscriptionId: subscription.id, planKey, razorpayPlanId: subscription.plan_id, status: subscription.status, currentStart: subscription.current_start, currentEnd: subscription.current_end, quantity: subscription.quantity });
  }

  return Response.json({ ok: true });
}
