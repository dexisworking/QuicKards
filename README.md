# QuicKards

**Design and generate ID cards in bulk with a Canva-style editor, CSV automation, and server-side rendering.**

QuicKards is a production-focused SaaS starter for colleges, festivals, events, and orgs that need fast, branded ID card generation at scale.

> **Suggested GitHub repository description:**  
> `Canva-style bulk ID card generator with CSV + image mapping, server-side rendering, and Appwrite backend.`

## Highlights

- Drag-and-drop template editor (Fabric.js)
- CSV import with robust field matching
- Single image and ZIP image mapping by `card_id`
- Batch preview + full render pipeline
- PDF + ZIP output generation
- Authenticated multi-user backend with Appwrite
- Auto-expiry policy for projects/templates (36 hours)

## Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Framer Motion
- **Editor:** Fabric.js
- **Backend:** Next.js Route Handlers (`/api/v1`)
- **Storage + Auth + DB:** Appwrite
- **Rendering:** sharp, pdf-lib, archiver, qrcode

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create environment file

```bash
cp .env.example .env.local
```

3. Fill `.env.local` with Appwrite values (project, endpoint, API key, DB/bucket IDs)

4. Bootstrap Appwrite resources

```bash
node --env-file=.env.local ./scripts/setup-appwrite.mjs
```

5. Run locally

```bash
npm run dev
```

App runs at `http://localhost:3000`.

## Environment Variables

Core values expected by QuicKards:

- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_TEMPLATES_COLLECTION_ID`
- `APPWRITE_PROJECTS_COLLECTION_ID`
- `APPWRITE_CARD_DATA_COLLECTION_ID`
- `APPWRITE_ASSETS_COLLECTION_ID`
- `APPWRITE_JOBS_COLLECTION_ID`
- `APPWRITE_TEMPLATE_BUCKET_ID`
- `APPWRITE_IMAGE_BUCKET_ID`
- `APPWRITE_OUTPUT_BUCKET_ID`
- `APPWRITE_SESSION_COOKIE_NAME`

## API Overview

Base path: `/api/v1`

- **Auth:** `POST /auth/signin`, `POST /auth/signup`, `POST /auth/signout`, `GET /auth/me`
- **Templates:** `POST/GET /templates`, `GET/PATCH/DELETE /templates/:id`, `POST /templates/:id/background`
- **Projects:** `POST/GET /projects`, `GET/DELETE /projects/:id`
- **CSV Data:** `POST/GET /projects/:id/data`
- **Images:** `POST /projects/:id/images/zip`, `POST /projects/:id/images`, `GET /projects/:id/images/:card_id`
- **Rendering:** `POST /projects/:id/preview`, `POST /projects/:id/render`, `GET /jobs/:job_id`
- **Downloads:** `GET /downloads/:file_id`

## Production Notes

- Rendering is **server-side only** (no client rendering pipeline).
- Keep Appwrite tables/buckets private; access is enforced through authenticated API handlers.
- Output file IDs are stored in job records and streamed through `/api/v1/downloads/:file_id`.
- If your Appwrite plan limits bucket count, you can reuse one bucket by pointing all three bucket env vars to the same ID.

## Scripts

- `npm run dev` – local dev server
- `npm run lint` – linting
- `npm run build` – production build
- `npm run start` – run production build
