// ============================================
// QUICKARDS — Razorpay subscriptions client
// ============================================
//
// Razorpay is called from server routes only. Checkout receives a subscription
// id and public key; the API secret never reaches the browser.

import type { PlanKey } from "./plans";

const PLAN_ENV: Partial<Record<PlanKey, string | undefined>> = {
  pro: process.env.RAZORPAY_PLAN_PRO_MONTHLY,
  team: process.env.RAZORPAY_PLAN_TEAM_MONTHLY,
  institution: process.env.RAZORPAY_PLAN_INSTITUTION_MONTHLY,
};

export type RazorpaySubscription = { id: string; plan_id: string; status: string; current_start?: number; current_end?: number; quantity?: number };

export async function createRazorpaySubscription(input: { plan: Exclude<PlanKey, "free">; organizationId: string; seats: number }) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const planId = PLAN_ENV[input.plan];
  if (!keyId || !keySecret || !planId) throw new Error("Razorpay is not configured for this plan");
  const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: { authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`, "content-type": "application/json" },
    body: JSON.stringify({ plan_id: planId, total_count: 1200, quantity: input.seats, customer_notify: true, notes: { organizationId: input.organizationId, planKey: input.plan } }),
  });
  if (!response.ok) throw new Error(`Razorpay subscription creation failed (${response.status})`);
  return await response.json() as RazorpaySubscription;
}
