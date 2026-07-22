// ============================================
// QUICKARDS — Ingest integration test (LIVE Neon + R2)
// ============================================
//
// The Phase 4 exit criterion: CSV rows land in Postgres, ZIP photos land in
// R2, through the real service + scoped repository.
//
// Gated behind QUICKARDS_INTEGRATION=1 so the normal offline `npm test` never
// touches the network. Run it with:
//   QUICKARDS_INTEGRATION=1 npx vitest run service.integration
// (env is loaded from .env.local below).

import { config } from "dotenv";
// override:true is required. Vitest/Vite pre-loads .env.local through its own
// env pipeline, which mangles DATABASE_URL (the neon driver ends up resolving a
// bogus `api.c-3.…` host). Re-parsing with dotenv and overriding restores the
// correct connection string before the neon client is constructed.
config({ path: ".env.local", override: true });

import { neon } from "@neondatabase/serverless";
import JSZip from "jszip";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { keys } from "@/lib/storage/keys";
import { deleteObjects, getObject } from "@/lib/storage/r2";
import type { OrgScope } from "@/lib/db/scope";
import { ingestCsvRows, ingestZip } from "./service";

const RUN = process.env.QUICKARDS_INTEGRATION === "1";

describe.runIf(RUN)("ingest integration (live Neon + R2)", () => {
  const sql = neon(process.env.DATABASE_URL!);
  const stamp = Date.now();
  const userId = `itest-user-${stamp}`;
  const orgId = `itest-org-${stamp}`;
  const projectId = crypto.randomUUID();
  const scope: OrgScope = { organizationId: orgId, userId, role: "owner" };

  beforeAll(async () => {
    await sql`insert into "user"(id, name, email, email_verified, created_at, updated_at)
      values(${userId}, 'itest', ${`itest-${stamp}@quickards.test`}, false, now(), now())`;
    await sql`insert into organization(id, name, slug, created_at)
      values(${orgId}, 'itest org', ${`itest-${stamp}`}, now())`;
    await sql`insert into member(id, organization_id, user_id, role, created_at)
      values(${`itest-m-${stamp}`}, ${orgId}, ${userId}, 'owner', now())`;
    await sql`insert into projects(id, organization_id, name, created_at, updated_at)
      values(${projectId}, ${orgId}, 'itest project', now(), now())`;
  });

  afterAll(async () => {
    // Cascades: org -> projects -> card_data/assets, plus member.
    await deleteObjects([
      keys.cardPhoto(orgId, projectId, "EMP001"),
      keys.cardPhoto(orgId, projectId, "EMP002"),
    ]).catch(() => {});
    await sql`delete from organization where id = ${orgId}`;
    await sql`delete from "user" where id = ${userId}`;
  });

  it("imports CSV rows into card_data, keyed by card_id", async () => {
    const result = await ingestCsvRows(scope, projectId, [
      { card_id: "EMP001", full_name: "Jane Doe" },
      { card_id: "EMP002", full_name: "John Roe" },
      { full_name: "No Id — dropped" },
    ]);

    expect(result).toEqual({ imported: 2, skippedNoCardId: 1 });

    const [{ count }] = await sql`select count(*)::int as count from card_data where project_id = ${projectId}`;
    expect(count).toBe(2);

    const [proj] = await sql`select status from projects where id = ${projectId}`;
    expect(proj.status).toBe("data_uploaded");
  });

  it("upserts on re-import rather than duplicating", async () => {
    await ingestCsvRows(scope, projectId, [{ card_id: "EMP001", full_name: "Jane Q. Doe" }]);

    const [{ count }] = await sql`select count(*)::int as count from card_data where project_id = ${projectId}`;
    expect(count).toBe(2); // still 2 — EMP001 updated, not added

    const [row] = await sql`select data from card_data where project_id = ${projectId} and card_id = 'EMP001'`;
    expect(row.data.full_name).toBe("Jane Q. Doe");
  });

  it("uploads ZIP photos to R2 and records assets", async () => {
    const zip = new JSZip();
    zip.file("EMP001.jpg", "fake-jpeg-bytes-1");
    zip.file("photos/EMP002.png", "fake-png-bytes-2");
    zip.file("README.txt", "should be skipped");
    const bytes = await zip.generateAsync({ type: "uint8array" });

    const result = await ingestZip(scope, projectId, bytes);
    expect(result.imported).toBe(2);
    expect(result.skipped.notImage).toBe(1);

    // Asset rows exist, one per card.
    const [{ count }] = await sql`select count(*)::int as count from assets where project_id = ${projectId}`;
    expect(count).toBe(2);

    // The bytes are actually in R2 at the deterministic key.
    const obj = await getObject(keys.cardPhoto(orgId, projectId, "EMP001"));
    expect(obj).not.toBeNull();
    expect(new TextDecoder().decode(obj!)).toBe("fake-jpeg-bytes-1");

    const [proj] = await sql`select status from projects where id = ${projectId}`;
    expect(proj.status).toBe("images_uploaded");
  });

  it("rejects ingest into a project outside the org", async () => {
    const foreign: OrgScope = { organizationId: "someone-else", userId: "x", role: "owner" };
    await expect(ingestCsvRows(foreign, projectId, [{ card_id: "X" }])).rejects.toThrow();
  });
});
