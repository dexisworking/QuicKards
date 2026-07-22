# Appwrite decommission plan

QuicKards v2 replaces Appwrite (auth + DB + storage) with Better Auth + Neon +
R2. This is the staged plan to remove every Appwrite dependency without leaving
the app broken in between.

## Principle

**Remove each piece of Appwrite only after its v2 replacement ships and is
verified.** The old code still compiles and is the only working UI until the v2
app shell/editor exist, so a premature `git rm` would leave nothing runnable.
The `node-appwrite` dependency and the Appwrite project itself come out in one
final cutover.

New v2 routes live at **`/api/…`**; the legacy Appwrite routes live at
**`/api/v1/…`**. They coexist by design — deleting `/api/v1` is the last step,
not a mid-flight one.

## Inventory (30 files) and their replacements

### Core Appwrite lib — deleted at cutover
| File | Replaced by | Status |
|---|---|---|
| `src/lib/appwrite/{client,records,collections}.ts` | `src/lib/db/*` (Drizzle) | ✅ replacement shipped |
| `src/lib/api/auth.ts` (session, requireUser) | `src/lib/auth/{server,session}.ts` | ✅ shipped |
| `src/lib/api/project.ts` (ensureProjectAccess) | `src/lib/db/scope.ts` | ✅ shipped |
| `src/lib/env/{server,public}.ts` (Appwrite env) | direct `process.env` in v2 modules | ✅ shipped |
| `src/lib/api/{request,response}.ts` | `src/lib/http/errors.ts`; `getCardIdFromFilename` → `src/lib/ingest/filename.ts` | ✅ shipped |

### v1 lib superseded
| File | Replaced by | Replacement phase |
|---|---|---|
| `src/lib/csv/parse.ts` | `src/lib/ingest/csv.ts` | ✅ Phase 4 |
| `src/lib/storage/{file-id,utils}.ts` | `src/lib/storage/{keys,presign,r2}.ts` | ✅ Phase 3 |
| `src/lib/template/normalize.ts`, `src/lib/types.ts` | `src/lib/design/{schema,migrate}.ts` | ✅ Phase 1 |
| `src/lib/render/{engine,load-project}.ts` | `src/lib/design/render/*` + `src/lib/render/rasterize.ts` | ⏳ Phase 5 |
| `src/lib/expiry.ts` (36h TTL) | R2 lifecycle + plan retention | ⏳ Phase 11 |

### v1 API routes (`src/app/api/v1/**`)
| Route(s) | Replaced by | Phase |
|---|---|---|
| `auth/{signin,signup,signout,me}` | `/api/auth/[...all]` (Better Auth) | ✅ Phase 2 |
| `projects/[id]/data` | `/api/projects/[id]/data` | ✅ Phase 4 |
| `projects/[id]/images*` (single, zip, [card_id]) | `/api/projects/[id]/assets/*` + presigned GET | ⏳ zip ✅; single/serve Phase 7 |
| `projects` CRUD, `templates*` | v2 project/template routes | ⏳ Phase 6/7 |
| `projects/[id]/{preview,render}`, `jobs/[job_id]`, `downloads/[file_id]` | Inngest pipeline + presigned output | ⏳ Phase 5 |
| `fonts`, `fonts/[id]/download` | font library routes | ⏳ Phase 9 |

### v1 pages & components
| Path | Replaced by | Phase |
|---|---|---|
| `src/app/page.tsx` (dual-mode) | `(marketing)` + `(app)` route groups | ⏳ Phase 6 |
| `src/app/{templates,projects}/**` pages | v2 app pages + editor | ⏳ Phase 6/7 |
| `src/components/**` (all v1 UI) | v2 components | ⏳ Phase 6/7 |

### Provisioning & deps
| Item | Replaced by | Status |
|---|---|---|
| `scripts/setup-appwrite.mjs` | `drizzle-kit migrate` + `drizzle/*` | ✅ **safe to delete now** |
| `node-appwrite` dependency | — | delete at cutover |
| Appwrite env vars in `.env.local` | Neon/R2/auth vars | delete at cutover |

## Removal waves

- **Now (zero-risk):** delete `scripts/setup-appwrite.mjs` and its README
  references — `drizzle-kit migrate` fully replaces it and nothing imports it.
- **End of Phase 5:** delete `src/lib/render/{engine,load-project}.ts` and the
  `preview/render/jobs/downloads` v1 routes once the Inngest pipeline is at
  parity.
- **During Phase 6/7:** as each v2 page/route lands, delete its v1 counterpart
  — the old dashboard, editor pages, `templates*`/`projects*` v1 routes, and
  the v1 components. This is the bulk of the removal.
- **Phase 9:** delete the v1 `fonts*` routes once the font library ships.
- **Final cutover (Phase 11):**
  1. Confirm `grep -r "node-appwrite\|@/lib/appwrite" src` returns nothing.
  2. `git rm -r src/app/api/v1 src/lib/appwrite src/lib/api src/lib/env src/lib/csv src/lib/template src/lib/expiry.ts src/lib/types.ts` (plus any stragglers the grep finds).
  3. `npm remove node-appwrite`.
  4. Remove `APPWRITE_*` and `NEXT_PUBLIC_APPWRITE_*` from `.env.local` / `.env.example`.
  5. Update `README.md` (stack, setup steps) to the v2 stack.
  6. `npm run typecheck && npm run lint && npm test` — all green.
  7. Delete the Appwrite project in the Appwrite console (last, after a deploy soak).

## Cutover safety check

The one-liner that gates the final cutover — it must return **nothing**:

```bash
grep -rE "node-appwrite|@/lib/appwrite|@/lib/api/(auth|project|request|response)|@/lib/env/(server|public)|@/lib/csv|@/lib/render/(engine|load-project)|@/lib/template/normalize|@/lib/types|@/lib/expiry" src
```

Every hit is a v2 replacement still owed. When it's empty, Appwrite can go.
