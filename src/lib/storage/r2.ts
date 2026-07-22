// ============================================
// QUICKARDS — Cloudflare R2 client
// ============================================
//
// SERVER ONLY. R2 is S3-compatible, so we drive it with the AWS S3 SDK v3.
//
// This replaces v1's model where EVERY byte was proxied through the Next.js
// server (`storage.getFileDownload`, base64 data URIs in JSON — see
// `images/[card_id]/route.ts`). Here the browser talks to R2 directly via
// presigned URLs (see presign.ts); the app only mints signatures and stores
// keys. R2's zero egress fee is the reason this scales — card images and output
// ZIPs are the bulk of the bytes, and none of them touch our server.
//
// THE CHECKSUM FOOTGUN (from the plan, and real): recent @aws-sdk/client-s3
// versions add `x-amz-checksum-*` "flexible checksum" headers by default, which
// R2 has historically rejected — with an error that never mentions checksums.
// `requestChecksumCalculation`/`responseChecksumValidation: "WHEN_REQUIRED"`
// disables that default. Costs five minutes to know, half a day to discover.

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

let client: S3Client | null = null;

export function r2(): S3Client {
  if (client) return client;

  const accountId = requireEnv("R2_ACCOUNT_ID");
  client = new S3Client({
    // R2 ignores region but the SDK requires one; "auto" is the R2 convention.
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
    // The footgun fix — see the module header.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

export const bucket = () => requireEnv("R2_BUCKET_NAME");

// ── Object operations ────────────────────────────────────────────────────────

/** Upload bytes. Used server-side for render outputs and ZIP-extracted photos;
 *  browser uploads go through a presigned PUT instead. */
export async function putObject(
  key: string,
  body: Uint8Array | Buffer,
  contentType?: string,
): Promise<void> {
  await r2().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }),
  );
}

/** Download bytes. Used by the render pipeline to pull photos/fonts for
 *  inlining — end users get presigned GETs, not this. */
export async function getObject(key: string): Promise<Uint8Array | null> {
  try {
    const res = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    if (!res.Body) return null;
    return await res.Body.transformToByteArray();
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function deleteObject(key: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

/** Delete up to 1000 keys in one request — the batch the storage reaper uses. */
export async function deleteObjects(keysToDelete: string[]): Promise<void> {
  if (keysToDelete.length === 0) return;
  await r2().send(
    new DeleteObjectsCommand({
      Bucket: bucket(),
      Delete: { Objects: keysToDelete.map((Key) => ({ Key })), Quiet: true },
    }),
  );
}

/** Every key under a prefix, paginated. Backs org-close cleanup. */
export async function listPrefix(prefix: string): Promise<string[]> {
  const out: string[] = [];
  let token: string | undefined;
  do {
    const res = await r2().send(
      new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix, ContinuationToken: token }),
    );
    for (const obj of res.Contents ?? []) if (obj.Key) out.push(obj.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

/** Liveness/config probe: confirms the bucket exists and the credentials work.
 *  Used by the Phase 3 verification and the health surface. */
export async function bucketReachable(): Promise<boolean> {
  try {
    await r2().send(new HeadBucketCommand({ Bucket: bucket() }));
    return true;
  } catch {
    return false;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "NoSuchKey" || error.name === "NotFound")
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. See docs/SETUP.md for the R2 setup.`);
  }
  return value;
}
