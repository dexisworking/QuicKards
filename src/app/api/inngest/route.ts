// ============================================
// QUICKARDS — Inngest serve endpoint
// ============================================
//
// Where Inngest reaches our functions. Local dev: run `npx inngest-cli dev`
// alongside `npm run dev` and it discovers this endpoint automatically.
//
// runtime = "nodejs" because the render functions pull in resvg (a native
// binary) and the Neon/R2 SDKs — none of which run on Edge.

import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { renderProject } from "@/lib/inngest/functions/render-project";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [renderProject],
});
