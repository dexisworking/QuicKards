// ============================================
// QUICKARDS — Schema barrel
// ============================================
//
// The single entry point drizzle-kit reads (see drizzle.config.ts) and the
// aggregate the migration tooling diffs against the database.
//
// `auth.ts` is GENERATED — do not hand-edit it. Regenerate after changing the
// Better Auth plugin set in `src/lib/auth/server.ts`:
//
//   (temporarily add a self-contained config mirroring server.ts, then)
//   npx @better-auth/cli generate --config <cfg> --output src/lib/db/schema/auth.ts -y
//
// Plugin registration order affects the generated columns, which is exactly
// why it is generated rather than hand-written — a drifted column name
// produces adapter errors that surface far from their cause.

export * from "./auth";
export * from "./app";
