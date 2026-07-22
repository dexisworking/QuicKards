// ============================================
// QUICKARDS — Usage enforcement tests (LIVE Neon)
// ============================================
//
// Limits are only real if something refuses work, and the refusal has to hold
// under concurrency. The last test here is the important one: it fires ten
// simultaneous reservations at a fifty-card allowance and asserts that exactly
// five succeed. A read-then-write implementation passes every other test in
// this file and fails that one.
//
// Gated behind QUICKARDS_INTEGRATION=1.

import { config } from "dotenv";
config({ path: ".env.local", override: true }); // vitest mangles DATABASE_URL otherwise

import { neon } from "@neondatabase/serverless";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { currentUsagePeriod } from "@/lib/billing/plans";
import {
  activePlanKey,
  commitReservedCards,
  releaseReservedCards,
  reserveCards,
  usageFor,
} from "./billing";

const RUN = process.env.QUICKARDS_INTEGRATION === "1";

describe.runIf(RUN)("usage enforcement (live Neon)", () => {
  const sql = neon(process.env.DATABASE_URL!);
  const stamp = Date.now();
  const orgId = `btest-org-${stamp}`;

  beforeEach(async () => {
    await sql`delete from organization where id = ${orgId}`;
    await sql`insert into organization(id, name, slug, created_at)
      values(${orgId}, 'btest', ${`btest-${stamp}-${Math.random().toString(36).slice(2, 7)}`}, now())`;
  });

  afterAll(async () => {
    await sql`delete from organization where id = ${orgId}`;
  });

  it("defaults to the free plan with no subscription", async () => {
    expect(await activePlanKey(orgId)).toBe("free");
  });

  it("reserves within the allowance and refuses beyond it", async () => {
    const first = await reserveCards(orgId, 30); // free = 50/period
    expect(first.ok).toBe(true);

    const tooBig = await reserveCards(orgId, 30); // 30 + 30 > 50
    expect(tooBig.ok).toBe(false);

    const fits = await reserveCards(orgId, 20); // 30 + 20 == 50
    expect(fits.ok).toBe(true);

    expect(await usageFor(orgId)).toEqual({ used: 0, reserved: 50 });
  });

  it("refuses a single job larger than the whole allowance", async () => {
    const result = await reserveCards(orgId, 5_000);
    expect(result.ok).toBe(false);
    // and it must not have written anything
    expect(await usageFor(orgId)).toEqual({ used: 0, reserved: 0 });
  });

  it("commits a reservation into actual usage", async () => {
    await reserveCards(orgId, 20);
    await commitReservedCards(orgId, 20);
    expect(await usageFor(orgId)).toEqual({ used: 20, reserved: 0 });
  });

  it("releases a reservation when a job fails", async () => {
    await reserveCards(orgId, 20);
    await releaseReservedCards(orgId, 20);
    expect(await usageFor(orgId)).toEqual({ used: 0, reserved: 0 });
  });

  it("never drives counters negative on a double release", async () => {
    await reserveCards(orgId, 10);
    await releaseReservedCards(orgId, 10);
    await releaseReservedCards(orgId, 10);
    expect(await usageFor(orgId)).toEqual({ used: 0, reserved: 0 });
  });

  it("raises the limit for an entitling subscription", async () => {
    await sql`insert into subscriptions(organization_id, plan_key, status, razorpay_subscription_id, created_at, updated_at)
      values(${orgId}, 'pro', 'active', ${`sub_${stamp}`}, now(), now())`;
    expect(await activePlanKey(orgId)).toBe("pro");

    // 500 would be refused on free (50) but fits on pro (2,000).
    expect((await reserveCards(orgId, 500)).ok).toBe(true);
  });

  it("holds the limit under concurrent reservations", async () => {
    // Ten simultaneous 10-card reservations against a 50-card allowance.
    const results = await Promise.all(
      Array.from({ length: 10 }, () => reserveCards(orgId, 10)),
    );
    const granted = results.filter((r) => r.ok).length;

    expect(granted).toBe(5);
    const usage = await usageFor(orgId);
    expect(usage.used + usage.reserved).toBe(50); // never exceeds the plan
  });

  it("counts usage per calendar period", async () => {
    await reserveCards(orgId, 10);
    const [row] = await sql`select period_start from usage_counters where organization_id = ${orgId}`;
    expect(row.period_start).toBe(currentUsagePeriod());
  });
});
