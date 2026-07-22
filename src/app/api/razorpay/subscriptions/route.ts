// ============================================
// QUICKARDS — Create a Razorpay subscription
// ============================================
//
// The selected plan attaches to the active organization, never the initiating
// user; a user can belong to multiple organizations with different plans.

import { z } from "zod";

import { applyRazorpaySubscription } from "@/lib/db/billing";
import { requireOrgScope } from "@/lib/auth/session";
import { createRazorpaySubscription } from "@/lib/billing/razorpay";
import { errorResponse } from "@/lib/http/errors";

export const runtime = "nodejs";
const RequestSchema = z.object({ plan: z.enum(["pro", "team", "institution"]), seats: z.number().int().min(1).max(100).default(1) });

export async function POST(request: Request) {
  try {
    const body = RequestSchema.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "Choose a paid plan and seat count" }, { status: 400 });
    const scope = await requireOrgScope();
    if (scope.role !== "owner" && scope.role !== "admin") return Response.json({ error: "Only workspace admins can manage billing" }, { status: 403 });
    const subscription = await createRazorpaySubscription({ plan: body.data.plan, organizationId: scope.organizationId, seats: body.data.seats });
    await applyRazorpaySubscription({ organizationId: scope.organizationId, subscriptionId: subscription.id, planKey: body.data.plan, razorpayPlanId: subscription.plan_id, status: subscription.status, currentStart: subscription.current_start, currentEnd: subscription.current_end, quantity: subscription.quantity });
    return Response.json({ subscriptionId: subscription.id, key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID });
  } catch (error) { return errorResponse(error); }
}
