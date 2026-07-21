// ============================================
// QUICKARDS — Font materialization for resvg
// ============================================
//
// SERVER ONLY.
//
// resvg (@resvg/resvg-js 2.6.2) can ONLY load fonts from filesystem paths —
// `font.fontFiles` or `font.fontDirs`. It has no buffer API, and it does NOT
// parse `@font-face` data: URIs out of the SVG. Both of those were verified
// empirically, not assumed:
//
//   loadSystemFonts:false, nothing supplied      -> blank output
//   loadSystemFonts:false + fontFiles path       -> renders correctly
//   loadSystemFonts:false + inlined @font-face   -> blank output
//
// So uploaded fonts have to be written to disk before a render. This module
// does that, once per process, keyed by content hash.
//
// A SHARP EDGE worth knowing about, also verified: passing an unrecognised key
// inside the `font` options object (we briefly passed `fontBuffers`, which
// does not exist) makes the native binding discard the ENTIRE options object
// and fall back to its defaults — including `loadSystemFonts: true`. The
// render then succeeds using whatever fonts the host happens to have, which
// looks perfect on a Windows laptop and renders tofu in a Linux container.
// That is a silent, environment-dependent failure of exactly the kind this
// rebuild exists to eliminate, so `rasterize()` passes only documented keys.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Process-lifetime cache: content hash -> path on disk.
 *
 *  Keyed by content rather than fontId so two orgs uploading the same file
 *  share one copy, and so a re-uploaded font under a new id does not write
 *  duplicate bytes. On Vercel this survives across warm invocations, which is
 *  most of them during a batch render. */
const materialized = new Map<string, string>();

let cacheDir: string | null = null;

function ensureCacheDir(): string {
  if (cacheDir) return cacheDir;
  // /tmp is the only writable location on most serverless runtimes, and it is
  // exactly where a per-instance font cache belongs.
  cacheDir = join(tmpdir(), "quickards-fonts");
  mkdirSync(cacheDir, { recursive: true });
  return cacheDir;
}

/**
 * Write font bytes to disk (once) and return the path resvg should load.
 *
 * The extension is meaningless to resvg — it sniffs the file — but keeping
 * `.ttf` makes the cache directory legible when debugging a font problem,
 * which is the only reason anyone will ever look in there.
 */
export function materializeFont(bytes: Uint8Array): string {
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 32);

  const existing = materialized.get(hash);
  if (existing) return existing;

  const path = join(ensureCacheDir(), `${hash}.ttf`);
  // Not guarded by existsSync: a stat costs about as much as the write for
  // files this size, and an unconditional write is idempotent and immune to a
  // half-written file left by a killed process.
  writeFileSync(path, bytes);

  materialized.set(hash, path);
  return path;
}

/** Materialize many fonts, preserving order and dropping empties. */
export function materializeFonts(fonts: Uint8Array[]): string[] {
  return fonts.filter((bytes) => bytes.byteLength > 0).map(materializeFont);
}
