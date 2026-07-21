// ============================================
// QUICKARDS — Isomorphic id generation
// ============================================
//
// Deliberately dependency-free. `src/lib/design/` is imported by the editor,
// the API routes, the Inngest render function and the v1 migrator, so every
// dependency it takes is paid for four times over. Web Crypto is available in
// browsers and in Node 19+, which is below our floor either way.
//
// Ids are 12 chars from a 62-char alphabet — ~71 bits of entropy. A single
// document holding a million nodes would still sit at a ~10^-9 collision
// probability, and real documents hold tens.

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const ID_LENGTH = 12;

/**
 * Mint a new node id.
 *
 * The rejection-sampling loop matters: `byte % 62` would map bytes 0-193 across
 * the alphabet 3.1 times and bytes 194-255 only 3 times, biasing the first 8
 * characters. Discarding the tail costs a handful of extra bytes and removes
 * the bias entirely.
 */
export function newId(length: number = ID_LENGTH): string {
  const max = 256 - (256 % ALPHABET.length); // 248 — the largest unbiased cutoff
  let out = "";

  while (out.length < length) {
    const bytes = new Uint8Array(length - out.length);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= max) continue;
      out += ALPHABET[byte % ALPHABET.length];
      if (out.length === length) break;
    }
  }

  return out;
}
