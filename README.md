# QuicKards

QuicKards is a full-stack SaaS MVP for bulk ID card generation using Appwrite + Next.js.

## Stack

- Next.js (App Router) + React + Tailwind CSS
- Appwrite (Auth + Databases + Storage)
- API routes under `src/app/api/v1`
- Server-side rendering engine with `sharp`, `pdf-lib`, and `archiver`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill your Appwrite values.

3. In Appwrite, create:

1. Database with ID in `APPWRITE_DATABASE_ID`
2. Collections:
   - `templates`
   - `projects`
   - `card_data`
   - `assets`
   - `jobs`
3. Buckets:
   - `templates`
   - `images`
   - `outputs`

4. Start app:

```bash
npm run dev
```

## API surface

Base path: `/api/v1`

- Auth: `POST /auth/signin`, `POST /auth/signup`, `POST /auth/signout`, `GET /auth/me`
- Templates: `POST/GET /templates`, `GET/PATCH/DELETE /templates/:id`, `POST /templates/:id/background`
- Projects: `POST/GET /projects`, `GET /projects/:id`
- CSV: `POST/GET /projects/:id/data`
- Images: `POST /projects/:id/images/zip`, `POST /projects/:id/images`, `GET /projects/:id/images/:card_id`
- Rendering: `POST /projects/:id/preview`, `POST /projects/:id/render`, `GET /jobs/:job_id`
- Downloads: `GET /downloads/:file_id`

## Notes

- Rendering is server-side only.
- Output ZIP file IDs are stored in jobs and streamed through `/api/v1/downloads/:file_id`.
- For Appwrite security, keep collections and buckets private; this app enforces user access in API handlers.
