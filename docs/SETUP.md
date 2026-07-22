# QuicKards v2 — External service setup

Four accounts back the v2 stack. This sheet walks each one and names the exact
values to capture. **You do not paste any of these into chat** — put them in
`.env.local` (copy `.env.example`) and tell Claude "env is set." The code reads
everything via `process.env`; the actual secret values never need to be seen.

> Region tip: pick the region closest to your users for anything that asks. For
> India, **AWS `ap-southeast-1` (Singapore)** is the nearest common option.
> Match your eventual Vercel region to it. Cloudflare R2 is global — no choice.

Phase 2 (the current phase) only needs the **Neon** and **Better Auth** rows.
The rest can be filled in as their phases arrive; nothing blocks on them today.

---

## 1. Neon (Postgres database) — needed now

1. Go to **neon.tech** → sign up (GitHub login is fastest).
2. **Create a project**. Name it `quickards`. Leave Postgres version at the
   default (17). Region: **AWS Asia Pacific (Singapore)** or nearest to you.
3. Neon auto-creates a database (`neondb`) and a role — nothing to configure.
4. Open **Dashboard → your project → Connect** (or "Connection Details").
   Copy the **pooled** connection string — the host contains `-pooler`. It
   looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
5. (Optional, recommended) **Branches → New branch**, name it `dev`. This gives
   a throwaway copy of the database with its own connection string, so
   experiments never touch what will become production data.

→ Put the connection string in `.env.local` as **`DATABASE_URL`**.

---

## 2. Better Auth secret — needed now (no account, just a secret)

Better Auth signs sessions with a local secret. Generate one:

```bash
# any of these works — you just need ~32 random bytes, base64
openssl rand -base64 32
# or, with Node:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

→ Put the output in `.env.local` as **`BETTER_AUTH_SECRET`**.
Leave **`BETTER_AUTH_URL`** and **`NEXT_PUBLIC_APP_URL`** at
`http://localhost:3000` for local dev (already set in `.env.example`).

### Google sign-in (optional)

1. In [Google Cloud Console](https://console.cloud.google.com/), create or select
   the QuicKards project, configure the OAuth consent screen, then create a
   **Web application** OAuth 2.0 client.
2. Add `http://localhost:3000` as an authorized JavaScript origin and
   `http://localhost:3000/api/auth/callback/google` as an authorized redirect
   URI. Add the equivalent production origin and callback URI before deploying.
3. Put the client id and client secret in `.env.local` as `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET`. The secret is server-only; do not use a
   `NEXT_PUBLIC_` name for it.

---

## 3. Cloudflare R2 (blob storage) — needed at Phase 3

1. **dash.cloudflare.com** → sign up / log in.
2. Left sidebar → **R2**. Cloudflare requires a **payment method on file** to
   enable R2 even on the free tier (10 GB storage, zero egress). Add a card;
   you will not be charged within the free tier.
3. **Create bucket**, name it `quickards`. Location: Automatic (or an APAC hint).
4. **Manage R2 API Tokens** (top-right on the R2 page) → **Create API Token**:
   - Permission: **Object Read & Write**
   - Scope: this specific bucket (safer) or all buckets
   - TTL: forever
   - Create — then **copy the Access Key ID and Secret Access Key now**; the
     secret is shown only once.
5. Note your **Account ID** (shown on the R2 overview, and in the dashboard
   URL). The S3 endpoint is derived from it:
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

→ Put in `.env.local`: **`R2_ACCOUNT_ID`**, **`R2_ACCESS_KEY_ID`**,
**`R2_SECRET_ACCESS_KEY`**, **`R2_BUCKET_NAME`** (= `quickards`).
CORS config comes with the Phase 3 upload code — Claude will give you the exact
policy JSON to paste into the bucket's settings then.

---

## 4. Inngest (render queue) — needed at Phase 5

1. **inngest.com** → sign up (GitHub).
2. It creates a default environment. Local development runs entirely against
   the **Inngest Dev Server** (`npx inngest-cli dev`) and needs **no keys** —
   so you can skip this until we deploy.
3. For the deployed app: **Environment → Manage → Keys**. Copy the
   **Event Key** and the **Signing Key**.

→ Put in `.env.local` (when you have them): **`INNGEST_EVENT_KEY`**,
**`INNGEST_SIGNING_KEY`**.

---

## 5. Stripe (billing) — needed at Phase 8

1. **stripe.com** → sign up. You land in **Test mode** automatically — that is
   all development needs.
2. **Developers → API keys**: copy the **Secret key** (`sk_test_…`) and
   **Publishable key** (`pk_test_…`).
3. The **webhook secret** (`whsec_…`) comes from `stripe listen` during local
   dev — Claude will cover that in Phase 8, not now.
4. **Start the live-mode application early** (Settings → Activate account). It
   asks for business details and can take **a few days** to approve. It does
   **not** block any development — test mode covers all of Phase 8.

→ Put in `.env.local` (when you have them): **`STRIPE_SECRET_KEY`**,
**`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`**.

---

## After you fill anything in

Just say **"env is set"** (or "Neon is set", etc.). Don't paste the values —
Claude verifies them by running commands that use `process.env` without
printing the secrets, e.g. `GET /api/health` round-tripping the database.
