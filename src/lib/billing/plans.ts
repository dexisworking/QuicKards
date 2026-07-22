// ============================================
// QUICKARDS — Product plan limits
// ============================================
//
// Limits are code-defined rather than fetched from Razorpay: a payment plan
// describes a price and cadence, while product enforcement needs reliable
// limits even while Razorpay is unavailable.

export const PLAN_LIMITS = {
  free: { name: "Free", cardsPerPeriod: 50, maxRowsPerProject: 50, seats: 1 },
  pro: { name: "Pro", cardsPerPeriod: 2_000, maxRowsPerProject: 2_000, seats: 3 },
  team: { name: "Team", cardsPerPeriod: 10_000, maxRowsPerProject: 5_000, seats: 10 },
  institution: { name: "Institution", cardsPerPeriod: 100_000, maxRowsPerProject: 5_000, seats: 100 },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export function planFor(key: string | null | undefined) {
  return PLAN_LIMITS[key as PlanKey] ?? PLAN_LIMITS.free;
}

/** UTC calendar month is intentional: it is stable across regions and simple
 * to reconcile from Razorpay's subscription period timestamps. */
export function currentUsagePeriod(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
