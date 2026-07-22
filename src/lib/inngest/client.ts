// ============================================
// QUICKARDS — Inngest client
// ============================================
//
// The render queue. Inngest moves batch rendering out of the HTTP request —
// v1 rendered every card inside one serverless invocation and hit the platform
// timeout on any real batch. Event key / signing key are read from the
// environment in production; local dev uses `npx inngest-cli dev` and needs
// neither.

import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "quickards" });

/** Payload of the render trigger. Inngest v4 dropped `EventSchemas`, so the
 *  event is typed at the use sites via this shape rather than on the client. */
export type RenderRequested = { jobId: string; organizationId: string };

export const RENDER_REQUESTED = "project/render.requested" as const;
