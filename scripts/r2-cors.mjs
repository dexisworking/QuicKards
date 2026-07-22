// ============================================
// QUICKARDS — Apply R2 bucket CORS
// ============================================
//
// Browser presigned PUTs fail without this: the browser sends a preflight
// OPTIONS, and R2 rejects the upload unless the bucket's CORS allows the
// method, the request headers, and the origin — and exposes ETag so the client
// can read it back. This MUST be applied before any browser upload code runs
// (Phase 4/7), which is why it is its own committed, re-runnable script.
//
// Run:  node --env-file=.env.local scripts/r2-cors.mjs
//
// Standalone (uses the AWS SDK directly, no TS/alias loader) so it works as a
// plain ops command. The client config mirrors src/lib/storage/r2.ts —
// including the checksum fix, without which R2 rejects the request opaquely.

import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const need = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. Run with: node --env-file=.env.local scripts/r2-cors.mjs`);
    process.exit(1);
  }
  return v;
};

const bucket = need("R2_BUCKET_NAME");

const client = new S3Client({
  region: "auto",
  endpoint: `https://${need("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: need("R2_ACCESS_KEY_ID"),
    secretAccessKey: need("R2_SECRET_ACCESS_KEY"),
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

// Origins allowed to upload/download from the browser. Add the production
// domain here (and re-run) at deploy time.
const origins = Array.from(
  new Set([process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", "http://localhost:3000"]),
);

const corsRules = [
  {
    AllowedOrigins: origins,
    AllowedMethods: ["GET", "PUT", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  },
];

try {
  await client.send(
    new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: corsRules } }),
  );
  console.log(`CORS applied to bucket "${bucket}" for origins: ${origins.join(", ")}`);

  const readBack = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log("Read-back:");
  console.log(JSON.stringify(readBack.CORSRules, null, 2));
} catch (error) {
  if (error?.name === "AccessDenied" || error?.$metadata?.httpStatusCode === 403) {
    // Setting CORS is a bucket-admin operation. An "Object Read & Write" token
    // (which is all object uploads/downloads need) cannot do it. Two fixes,
    // either is fine — CORS only matters once the browser upload UI exists.
    console.error("AccessDenied: this R2 token cannot set bucket CORS (it is object-scoped).");
    console.error("");
    console.error("Option A — paste in the dashboard (easiest):");
    console.error("  R2 > bucket > Settings > CORS Policy > Add, with this JSON:");
    console.error(JSON.stringify(corsRules, null, 2));
    console.error("");
    console.error("Option B — create an R2 token with 'Admin Read & Write', put its");
    console.error("  Access Key ID / Secret in .env.local, and re-run this script.");
    process.exit(1);
  }
  throw error;
}
