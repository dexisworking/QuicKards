# QuicKards

**Design and generate ID cards in bulk with a Canva-style editor, CSV automation, and server-side rendering.**

QuicKards is a production-focused SaaS starter for colleges, festivals, events, and orgs that need fast, branded ID card generation at scale.


> **Status: v2 rebuild in progress.** The backend is being migrated off
> Appwrite to Neon (Postgres) + Better Auth + Cloudflare R2, and the editor is
> being rebuilt around a single shared SVG renderer. See
> [`docs/APPWRITE-REMOVAL.md`](docs/APPWRITE-REMOVAL.md) for the decommission
> plan. Some legacy Appwrite routes under `/api/v1` still exist and are removed
> phase by phase as their v2 replacements land.

## Highlights

- Canva-style template editor built on one document model that drives both the
  editor and server-side rendering (no more editor/renderer drift)
- CSV import with robust `card_id` field matching
- ZIP image mapping by `card_id`
- Batch render pipeline → PDF + ZIP output
- Teams/organizations with per-tenant isolation
- Background render queue (no inline request-timeout limits)

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Framer Motion
- **Database:** Neon (Postgres) + Drizzle ORM
- **Auth:** Better Auth (organization plugin), sessions in Postgres
- **Blob storage:** Cloudflare R2 (S3-compatible, presigned URLs)
- **Render queue:** Inngest
- **Rendering:** `@resvg/resvg-js` (SVG → PNG), sharp, pdf-lib, archiver, qrcode

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create your environment file and fill it in — see
   [`docs/SETUP.md`](docs/SETUP.md) for where each value comes from (Neon, R2,
   Inngest, Stripe).

```bash
cp .env.example .env.local
```

3. Apply the database schema to your Neon database

```bash
npx drizzle-kit migrate
```

4. Run locally

```bash
npm run dev
```

App runs at `http://localhost:3000`. Verify the database connection at
`http://localhost:3000/api/health`.

## Environment Variables

See [`.env.example`](.env.example) for the full list and
[`docs/SETUP.md`](docs/SETUP.md) for where each value comes from. In brief:

- **Database:** `DATABASE_URL` (Neon pooled connection string)
- **Auth:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`
- **Blob storage:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- **Render queue (Phase 5):** `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- **Billing (Phase 8):** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## Production Notes

- Rendering is **server-side**, driven by the same document model the editor
  uses (`src/lib/design`) so on-screen and printed output cannot diverge.
- Every app table is scoped by `organizationId`; queries go through the
  lint-enforced scoped repository in `src/lib/db/scope.ts`.
- Card images and render outputs live in R2 and are served via presigned URLs —
  bytes are not proxied through the app server.
- Schema changes: edit `src/lib/db/schema`, then `npx drizzle-kit generate`
  and `npx drizzle-kit migrate`.

## Scripts

- `npm run dev` – local dev server
- `npm run lint` – linting
- `npm run build` – production build
- `npm run start` – run production build
