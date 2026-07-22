// ============================================
// QUICKARDS — Presigned URLs
// ============================================
//
// SERVER ONLY. The heart of the "don't proxy bytes" model. The app hands the
// browser a short-lived signed URL and steps out of the data path entirely:
// the browser PUTs a photo straight to R2, and GETs it straight back.
//
// Presigning MUST use the S3 endpoint (r2.cloudflarestorage.com, set in r2.ts),
// never the public r2.dev domain — a signature against the wrong host is
// rejected with an opaque error. For browser PUTs to succeed the bucket also
// needs CORS allowing PUT + the Content-Type header from the app origin; that
// is applied by scripts/r2-cors.mjs and must exist before the first upload.

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { bucket, r2 } from "./r2";

/** Default lifetime. Long enough for a large photo on a slow connection, short
 *  enough that a leaked URL is quickly useless. Uploads and downloads both use
 *  it unless a caller overrides. */
const DEFAULT_EXPIRY_SECONDS = 300;

export type PresignedUpload = {
  url: string;
  key: string;
  /** The browser MUST send exactly this Content-Type on the PUT — it is part
   *  of the signature, and a mismatch fails the request. */
  contentType: string;
  expiresIn: number;
};

/**
 * A presigned PUT for a browser to upload one object.
 *
 * The Content-Type is baked into the signature deliberately: it stops a client
 * from uploading an executable under a key we expect to be an image, and it is
 * what R2 stores and later serves.
 */
export async function presignUpload(
  key: string,
  contentType: string,
  expiresIn = DEFAULT_EXPIRY_SECONDS,
): Promise<PresignedUpload> {
  const url = await getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn },
  );
  return { url, key, contentType, expiresIn };
}

/**
 * A presigned GET for private objects (card photos, render outputs).
 *
 * `downloadAs` sets Content-Disposition so a job ZIP downloads with a sensible
 * filename rather than the uuid key — the small touch that makes the output
 * feel finished.
 */
export async function presignDownload(
  key: string,
  options: { expiresIn?: number; downloadAs?: string } = {},
): Promise<string> {
  return getSignedUrl(
    r2(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: options.downloadAs
        ? `attachment; filename="${options.downloadAs.replace(/"/g, "")}"`
        : undefined,
    }),
    { expiresIn: options.expiresIn ?? DEFAULT_EXPIRY_SECONDS },
  );
}
