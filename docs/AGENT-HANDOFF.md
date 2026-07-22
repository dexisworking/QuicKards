# QuicKards v2 — Agent handoff brief (Phases 7–11)

You are continuing a phased rebuild of QuicKards. Phases 0–6 are **done, committed,
and verified live**. This document is your full context and instructions for the
remaining phases. Read it completely before writing code.

---

## 0. How to use this document

- This is a **cold-start brief**. You have no prior conversation context; everything
  you need is here or in the files it points to.
- Work **one phase at a time, in order** (7 → 11). Each phase ends with something
  runnable and demonstrable. Do not start a phase before the previous one is green.
- After each meaningful unit of work: `npm run typecheck`, `npm test`, `npm run lint`,
  then commit. Match the existing commit style (see §6).
- The authoritative plan lives at
  `C:\Users\LENOVO\.claude\plans\let-s-plan-on-making-rosy-sundae.md` if accessible;
  this brief distills and supersedes it for Phases 7–11.
- Persistent project memory (read it) is at
  `C:\Users\LENOVO\.claude\projects\C--Users-LENOVO-Desktop-Projects-QuicKards\memory\`.

---

## 1. What QuicKards is

A **bulk ID-card generator SaaS**, shipping as a product of **DexForge**
(`C:\Users\LENOVO\Desktop\Projects\DexForge`, a founder-led software studio; brand red
`#DC2626`, Inter, dark aesthetic). Workflow: a user designs a card template in a
Canva-style editor, imports a CSV of people, maps photos by `card_id`, and renders a
batch of PNGs + a print-ready PDF.

**Why the v2 rebuild:** v1 (still partly present under `src/app/api/v1/**` and
`src/lib/{api,appwrite,csv,env,template}`) had two divergent renderers (Fabric editor
vs server SVG strings) that drifted and produced silent bugs; a data model that
conflated display/binding/label in one field; and no path to SaaS (36h TTL, inline
rendering, no orgs). v2 fixes all three.

---

## 2. Current state (what is already built and verified)

**Branch:** `master`. **HEAD:** `fe69a66`. Node 22, Next.js **16.2.3** (App Router,
Turbopack), React 19.2.4, TypeScript strict, Tailwind **v4** (CSS-first, no config file).

| Phase | Status | What exists |
|---|---|---|
| 0 | ✅ | deps installed, Next 16 docs read |
| 1 | ✅ | Canonical `CardDocument` zod schema + **one shared SVG renderer**; 39 tests; real PNG output verified |
| 2 | ✅ | Neon Postgres + Drizzle (17 tables), Better Auth (org plugin), scoped repo; live signup/org verified |
| 3 | ✅ | Cloudflare R2 client + presigned URLs; live round-trip verified |
| 4 | ✅ | CSV + ZIP ingest, org-scoped; live-verified (CSV→Neon, ZIP→R2) |
| 5 | ✅ | Inngest render pipeline (v1 PARITY, headless); live-verified (design+CSV+photos → PDF/ZIP in R2) |
| 6 | ✅ | v2 frontend: design system, 3 route groups, Better-Auth sign-in/up, auth-gated dashboard, theme toggle; verified live |

**Verified live** = actually ran against the real Neon DB and R2 bucket, not just
typechecked. Test suite: **63 offline tests pass**; integration tests (live DB+R2) are
gated behind `QUICKARDS_INTEGRATION=1` (see §7, §11).

The **backend is feature-complete for v1 parity.** Remaining phases are UI (editor),
billing, gallery, the DexForge listing, and hardening/launch.

---

## 3. Locked decisions — do NOT relitigate

- **Editor:** SVG/DOM with **ONE shared renderer**. The canonical `CardDocument` (zod,
  `src/lib/design/schema.ts`) drives both the editor (React via `emit-react.tsx`) and
  server rasterization (resvg via `emit-string.ts`). Never introduce a second renderer.
- **DB:** Neon Postgres + Drizzle, Neon HTTP driver. **Auth:** Better Auth (org plugin),
  tables in Neon. **A Clerk subscription exists but is deliberately unused** — do not
  switch auth.
- **Blobs:** Cloudflare R2 + presigned URLs (bytes never proxied through the app).
- **Queue:** Inngest.
- **Billing:** **Razorpay** (NOT Stripe — the user is India-based). No Better Auth plugin
  exists for it; Phase 8 is a custom integration.
- **Frontend:** inherits DexForge brand tokens; marketing surface dark-only, app surface
  themeable via `--k-*`.
- **Tenancy:** every app row is scoped by `organizationId`. All DB access goes through
  `scoped(orgScope)` in `src/lib/db/scope.ts` — an ESLint rule forbids importing the raw
  `db` client elsewhere.

---

## 4. Repository map

### v2 code (this is what you extend — match its patterns)

```
src/lib/design/            ISOMORPHIC design library (no node:/DOM at top level)
  schema.ts                CardDocument zod schema — the contract everything binds to
  bindings.ts              column resolution (normalizeColumnKey preserved from v1)
  geometry.ts              transforms, clip paths, fit math (editor + renderer share)
  id.ts                    newId() — 12-char ids for DOCUMENT NODES (NOT db uuids!)
  migrate.ts               v1 TemplateField[] → CardDocument
  render/
    ir.ts                  SvgIR type + RenderWarning
    build.ts               buildDocumentIR() — THE layout implementation
    emit-string.ts         SvgIR → string (server/resvg)
    emit-react.tsx         SvgIR → React (editor) — Phase 7 paints with this
    resolver.ts            ResourceResolver interface
    resolver.server.ts     server resolver (R2/DB → data URIs, font paths)
    resolver.client.ts     ⚠ NOT YET CREATED — Phase 7 must add (browser resolver)
  text/                    layout.ts (wrap/autoFit), metrics.ts, opentype-metrics.ts
  codes/generate.ts        QR → SVG path
src/lib/render/            SERVER-ONLY rasterization/assembly
  rasterize.ts             resvg (fonts loaded from PATHS only — see §7)
  font-cache.ts            materialize fonts to /tmp for resvg
  pdf.ts, zip.ts           output assembly (adapted from v1)
  pipeline.ts              loadRenderContext / renderCardsToR2 / assembleOutput / renderJobInline
src/lib/db/
  client.ts                lazy Drizzle client (do NOT import outside src/lib/db)
  scope.ts                 scoped(orgScope) repository — the tenancy backbone
  membership.ts, onboarding.ts, health.ts
  schema/{auth.ts,app.ts,index.ts}   auth.ts is GENERATED (do not hand-edit)
src/lib/auth/              server.ts (Better Auth config), client.ts, session.ts, onboarding.ts
src/lib/storage/           r2.ts, presign.ts, keys.ts
src/lib/ingest/            csv.ts, filename.ts, zip.ts, service.ts
src/lib/inngest/           client.ts, functions/render-project.ts
src/lib/http/errors.ts     errorResponse() — uniform route error mapping
src/lib/theme.ts (client-safe) + theme.server.ts (getAppTheme)
src/lib/utils.ts           cn()
src/components/ui/          Button, Input, Field, Card (cva, --k-* tokens, default export)
src/components/app/         AppNav, ThemeToggle, SignOutButton, PageHeader, EmptyState, ComingInEditor
src/components/auth/        AuthForm
src/app/
  (marketing)/  layout + landing (dark, @theme tokens)
  (auth)/       layout + sign-in + sign-up
  (app)/        layout (auth gate) + dashboard + templates/projects/fonts (+ /new placeholders)
  api/          auth/[...all], health, inngest, jobs/[id](+/download),
                projects/[id]/{data,assets/zip,render}
```

### v1 legacy (being removed — see docs/APPWRITE-REMOVAL.md)

`src/app/api/v1/**`, `src/lib/{api,appwrite,csv,env,template}`,
`src/lib/render/{engine.ts,load-project.ts}`, `src/lib/storage/{file-id.ts,utils.ts}`,
`src/lib/expiry.ts`, `src/lib/types.ts`, and the `node-appwrite`
dependency. **Do not import these from v2 code.** They still compile; delete each as its
v2 replacement lands. `src/lib/supabase/` is a stray empty dir — safe to `rmdir`.

---

## 5. Conventions you MUST follow

- **File header banner** on every authored file: `// ==== QUICKARDS — <Name> ====`, then a
  comment explaining *why* the module exists / the non-obvious decision. Match the density
  of existing files — comments explain rationale, not mechanics.
- **Naming:** PascalCase for React components (`Button.tsx`, default export), kebab/lower
  for non-component modules. `cva` for component variants. `cn()` from `@/lib/utils`.
- **App-surface components** read `--k-*` tokens (e.g. `bg-[var(--k-surface)]`,
  `text-[var(--k-text)]`); marketing uses `@theme` utilities (`bg-bg`, `text-red`).
- **Server/client boundary:** never import a module that pulls `next/headers`/`next/server`
  into a `"use client"` component. If a module has both server-only and client-safe exports,
  split it (precedent: `theme.ts` + `theme.server.ts`).
- **Route handlers** touching DB/R2/resvg need `export const runtime = "nodejs"`. Params are
  a Promise: `context: { params: Promise<{ id: string }> }` then `await context.params`.
- **Tenancy:** route handlers call `requireOrgScope()` (`src/lib/auth/session.ts`) → get an
  `OrgScope` → `scoped(scope)`. Never touch `db` directly outside `src/lib/db/**`. Map errors
  with `errorResponse()` (`AuthError`→status, `OrgScopeError`→404, else opaque 500).
- **IDs:** `newId()` (12-char) is for **document node ids only**. DB uuid PKs use
  `crypto.randomUUID()` (a real bug was caught here — see §7).
- **New v2 API routes** go under `/api/…` (no `v1`). The old `/api/v1/**` stays until cutover.
- **AGENTS.md mandate:** before writing Next.js-API code, read the relevant guide under
  `node_modules/next/dist/docs/` — this Next version has real breaking changes (see §7).

---

## 6. Commit & verification discipline

- Commit in coherent units. Message: a `type(scope): summary` line, a body explaining the
  *why* and any bug/gotcha, and end with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Before committing: `npm run typecheck && npm test && npm run lint` must be clean (the one
  pre-existing lint warning in `src/app/api/v1/fonts/[id]/download/route.ts` is v1 legacy —
  ignore it, it's deleted at cutover).
- **"Verified" means you ran it**, not that it typechecks. Prefer a gated integration test
  (live DB+R2) or actually driving the dev server. Typecheck-only is not verification.

---

## 7. Hard-won gotchas (READ THIS — each cost real debugging)

1. **resvg loads fonts ONLY from filesystem paths** (`@resvg/resvg-js` 2.6). No buffer API;
   `@font-face` data: URIs are ignored (render blank). Uploaded fonts are materialized to
   `/tmp` by `src/lib/render/font-cache.ts`. AND: **passing an unrecognised key in the resvg
   `font` options makes the native binding discard the whole config and revert to
   `loadSystemFonts: true`** → output depends on host fonts (fine on Windows, tofu in a Linux
   container). `rasterize.ts` passes only documented keys. A determinism test guards this.
2. **Next.js 16 breaking changes** (`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`):
   `cookies()`/`headers()`/`params`/`searchParams` are **async-only**; `middleware.ts` →
   `proxy.ts` (nodejs-only); Turbopack is default (a custom webpack config fails the build);
   `revalidateTag` needs a 2nd `cacheLife` arg. `nextCookies()` must be LAST in the Better
   Auth plugins array.
3. **vitest mangles `DATABASE_URL`** when it pre-loads `.env.local` (the neon driver then
   resolves a bogus `api.c-3.…` host, ENOTFOUND). Every live-DB test must start with
   `import { config } from "dotenv"; config({ path: ".env.local", override: true });`.
   Integration tests are named `*.integration.test.ts` and gated behind
   `QUICKARDS_INTEGRATION=1`.
4. **App Router renders a layout and its page CONCURRENTLY.** A layout that "ensures" state
   (e.g. creates an org) cannot be relied on to finish before the page reads it. Org creation
   is done in a **Better Auth `databaseHooks.user.create.after`** hook (`createPersonalOrg`),
   not the layout. Apply the same reasoning to any create-then-read-in-same-nav flow.
5. **DB uuid PKs need `crypto.randomUUID()`, not `newId()`** (12-char). A live test caught
   `scope.ts` inserting 12-char ids into uuid columns — would have failed every insert in prod.
6. **AWS SDK v3 + R2 checksum footgun:** set `requestChecksumCalculation` /
   `responseChecksumValidation: "WHEN_REQUIRED"` (done in `r2.ts`) or R2 rejects with an error
   that never mentions checksums.
7. **`.npmrc` has `legacy-peer-deps=true`** — better-auth's optional `@sveltejs/kit` peer
   drags in vite@8 and clashes with vitest's vite@7. Keep it; `npm install` fails without it.
8. **`.env*` is gitignored except `!.env.example`.** Keep it that way; never commit real env.
9. **Inngest v4 API:** `EventSchemas` is gone (type events at use sites); `createFunction` is
   `(options, handler)` with the trigger inside `options.triggers`.
10. **Stale `.next` type validators** reference deleted routes and can break `tsc`. If you
    delete pages/routes, `rm -rf .next` before typechecking.

---

## 8. Environment & credentials

`.env.local` (git-ignored) currently has **everything needed through Phase 7**: `DATABASE_URL`
(Neon, PG18), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and the R2 block
(`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_API_TOKEN`, `R2_BUCKET_NAME=quickards`).
It also still has 12 stale `APPWRITE_*` vars (harmless; removed at cutover).

**Empty, needed later** (scaffolded in `.env.local`/`.env.example`, `docs/SETUP.md` has fetch steps):
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` — **deploy only**. Local dev runs `npx inngest-cli dev`.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET`
  — **Phase 8**. Razorpay Dashboard → Settings → API Keys (test mode, no KYC).

**Outstanding USER actions (non-blocking, ask the user — do not attempt yourself):**
- **R2 bucket CORS** must be applied before browser uploads work (Phase 7). The user's token
  is object-scoped and can't set it; they apply it via the Cloudflare dashboard or an admin
  token + `scripts/r2-cors.mjs`. Exact CORS JSON is in that script.
- The user pasted the Neon password and R2 token in chat earlier; they should rotate both.

Run the app: `npm run dev` → http://localhost:3000, health at `/api/health`.
Migrations: edit `src/lib/db/schema/*`, then `npx drizzle-kit generate` + `npx drizzle-kit migrate`.

---

## 9. PHASE 7 — The editor (the big one; ~3 weeks; highest risk)

**Goal:** replace the `/templates/new` and `/templates/[id]` placeholders with a Canva-like
editor, and build the project workspace (`/projects/[id]`) that drives CSV/photo upload +
render. Everything renders through the **existing Phase 1 shared renderer** — you are building
an *interaction layer*, not a renderer.

**First: draw the MVP cut line in writing and stick to it.**

| v1 ships | v1.1 defers |
|---|---|
| select, move, resize, rotate | multi-select rotation |
| multi-select + align/distribute | bezier/path editing |
| undo/redo + full keyboard shortcuts | component/symbol instances |
| layers panel, z-order, groups | rulers, custom guides |
| smart guides + snapping | gradient fills |
| front/back sides | effects beyond one shadow |
| autosave | real-time collaboration |
| data-binding panel + live row preview | conditional visibility |

**Architecture (per plan §4/§5):**
- **Two zustand stores.** `document-store` holds the `CardDocument` + **patch-based undo/redo**
  via immer `produceWithPatches` (past/future stacks of forward+inverse patches, NOT snapshots),
  with **coalescing** (rapid same-label edits merge) and **transactions** (`begin`/`commit`/
  `abort` wrap a drag gesture into one undo step; `abort` applies the inverse = Escape-cancels).
  `ui-store` holds selection, zoom, pan, active side, drag state — kept OUT of history.
- **Paint with `IRToReact`** (`emit-react.tsx`) over `buildDocumentIR(doc, { mode: "editor", … })`.
  Editor mode tags nodes with `data-node-id` for hit-testing. Do NOT `dangerouslySetInnerHTML` a
  string — that kills reconciliation.
- **Create `src/lib/design/render/resolver.client.ts`** (browser `ResourceResolver`): images as
  `blob:`/`https:` hrefs; fonts via the `FontFace` API + opentype.js metrics from the SAME bytes.
- **Hand-built interaction:** transform handles, marquee, snapping (grid + object smart guides),
  multi-select, groups, layers panel, keyboard shortcuts (Delete, Cmd/Ctrl+Z/Y, arrows nudge,
  Cmd+D duplicate, Cmd+G group, brackets for z-order), on-canvas text editing.
- **Geometry:** reuse `src/lib/design/geometry.ts` (transforms/clip/fit) so selection handles and
  painted nodes never disagree.
- **FOUT is a correctness bug here.** Load all `document.fonts` (schema-level `FontRef[]`) via
  `document.fonts.load(...)` BEFORE first paint (skeleton meanwhile); load the same bytes into
  opentype.js in the same pass; `font-display: block`; load a newly-picked font before committing.
- **Editor is full-bleed** — it escapes the AppShell chrome (the `(app)/templates/[id]` route
  renders its own full-viewport layout).
- **Autosave:** debounced `PUT /api/templates/[id]/document` (build this route) with optimistic
  concurrency on a `baseVersion` → 409 prompts rather than clobbering. Saving creates a NEW
  `design_versions` row and advances `templates.currentVersionId` (add a
  `scope.templates.updateDocument` method that inserts a version + bumps the head).

**Routes/repo to add:** template create/rename/delete; `PUT …/document` (autosave, new version);
project create (`POST /api/projects`, `scope.projects.create` exists); a font-list route the
editor uses; presigned-upload route for editor image assets (`presignUpload` exists in
`storage/presign.ts`). The project workspace UI drives the **already-built** Phase 4/5 backend
(`/api/projects/[id]/data`, `/assets/zip`, `/render`, `/api/jobs/[id]`(+`/download`)).

**Also do early in this phase:** verify the Inngest **fan-out** end to end by running
`npx inngest-cli dev` beside `npm run dev` and triggering a render from the new UI (Phase 5
proved the pipeline core via `renderJobInline`, but the queued fan-out path hasn't been run
against the dev server yet). Apply R2 CORS first (user action).

**Verify:** create a template, add/move/rotate/group nodes, undo/redo 20 steps, autosave, reload,
confirm identical. Then render that template via a project and diff the output against the
on-screen SVG — **this is the test that proves the shared-renderer thesis.**

**Remove at end:** `src/components/editor` (v1, already deleted) — n/a; delete the v1
`/api/v1/templates/**` routes and `src/lib/render/{engine,load-project}.ts` once the editor +
render UI fully replace them.

---

## 10. PHASE 8 — Razorpay billing + usage limits (~1 week)

**Custom integration — no Better Auth plugin.**
- **Schema (Drizzle):** add `plans` (or code-defined `PlanLimits`) and `subscriptions`
  (organizationId FK, razorpay ids, status, current-period end). `usage_counters` already exists
  with `cardsRendered` + `cardsReserved`.
- **Subscription attaches to `organizationId`, never `userId`** (the same principle the Stripe
  plan flagged — a user in two orgs must not give both their plan).
- **Flow:** Razorpay Checkout (client, `NEXT_PUBLIC_RAZORPAY_KEY_ID`) → create Order/Subscription
  server-side (`RAZORPAY_KEY_ID`/`SECRET`) → **webhook** (`/api/razorpay/webhook`, `runtime nodejs`)
  verifying `X-Razorpay-Signature` HMAC with `RAZORPAY_WEBHOOK_SECRET`. **Persist processed event
  ids and no-op on repeats** (Razorpay retries; idempotency is mandatory).
- **Enforcement:** reserve usage at render **enqueue** (`usage_counters.reserved += rows`),
  reconcile at completion; block enqueue when `used + reserved >= limit`. Make the 5000-row cap a
  **plan limit** (`maxRowsPerProject`), not a constant. Seats as a **hard cap** for v1 (simpler).
- **UI:** pricing table (marketing), `settings/billing` + `settings/usage` (app). Tiers (starting
  point, validate with user): Free / Pro / Team / Institution — see plan §7.
- Test mode needs no KYC; **live payments need Razorpay business KYC** — tell the user to start early.

**Verify:** test-mode checkout → subscription row updates via webhook → limit enforced at enqueue
→ a replayed webhook does not double-apply.

---

## 11. PHASE 9 — Gallery, font library, presets (~1 week)

- **Public SEO gallery** at `(marketing)/gallery` — one indexable page per starter template
  ("Student ID", "Event Pass", "Visitor Badge"). `gallery_templates` table already exists.
- **Fork flow:** create a user template from `gallery_templates.document` (a
  `scope.templates.createFromGallery`).
- **Font library + upload:** font upload route (`.ttf`/`.otf` → R2 via `keys.font` + a `fonts` row;
  `scope.fonts.create`), expanded curated library.
- **CRITICAL regression check:** fork a template that uses a custom font and render it — confirm the
  font appears in output. This was v1's signature bug (fonts displayed in editor, never in output);
  it is structurally fixed in v2, but verify it end to end here.

---

## 12. PHASE 10 — List QuicKards on DexForge (~1 day)

Cross-repo into `C:\Users\LENOVO\Desktop\Projects\DexForge`:
1. Append a `Product` entry to `DexForge/src/data/products.ts` (`slug: 'quickards'`,
   `status: 'shipped'`, techStack Next 16/TS/PostgreSQL/Drizzle/Better Auth/R2/Inngest/Tailwind 4,
   `liveUrl`, pillars, features, screenshots). Follow the **LazyPrep** entry as the precedent.
2. Add `DexForge/src/app/products/quickards/{layout,page}.tsx` (copy `products/lazyprep/`).
3. Add `DexForge/public/products/quickards/` assets at their **true intrinsic dimensions**.
4. `ProductPillar.icon` is a fixed union (`design|layout|ambient|repeat|target|sparkles`) — extend
   it (e.g. `grid`/`zap`) and its lucide mapping in the view layer. `FeaturedProducts`/`sitemap.ts`
   pick the product up automatically.

---

## 13. PHASE 11 — Hardening, GC, observability, launch (~1 week)

- **Blob GC:** drain `storage_reap_queue` (already in schema) via an Inngest cron; enqueue R2 keys
  on row delete. Add **R2 lifecycle rules** to expire `job/*/output.zip` after 7 days.
- **Cascade audit:** confirm deleting an org removes all its rows (cascades exist) and no orphaned
  R2 objects remain (the reaper handles blobs).
- **Observability:** PostHog activation funnel (`signup → template created → CSV uploaded → first
  render → download`), Sentry.
- **Load test** at 2,000 cards through the Inngest fan-out; confirm no step exceeds the serverless
  cap and step outputs stay small (keys, not buffers).
- **RLS:** decided **skipped for v1** (Neon HTTP driver has no session for `set_config`; the
  lint-enforced repository is sufficient). Revisit only if truly needed.
- **Final Appwrite cutover** (see `docs/APPWRITE-REMOVAL.md`): the grep gate there must return
  empty, then `git rm -r src/app/api/v1 src/lib/{api,appwrite,csv,env,template} …`,
  `npm remove node-appwrite`, drop `APPWRITE_*` env, update README, delete the Appwrite project.
- **Launch gates:** Razorpay live KYC done, privacy policy + terms (adapt DexForge's), credentials
  rotated, R2 lifecycle live, reaper running.

---

## 14. Guardrails — what NOT to do

- Do not introduce a second renderer or bypass `buildDocumentIR`. One document → one renderer.
- Do not import `@/lib/db/client` outside `src/lib/db/**` (lint will fail); go through `scoped()`.
- Do not switch auth to Clerk, or billing to Stripe. Locked.
- Do not hand-edit `src/lib/db/schema/auth.ts` (generated). Regenerate via the Better Auth CLI.
- Do not commit real env or secrets. Do not perform user-only actions (R2 CORS, credential
  rotation, KYC) yourself — surface them to the user.
- Do not delete v1 code ahead of its v2 replacement (things must keep compiling).
- Do not mark a phase done on typecheck alone — run it.
```
