import { requireUser } from "@/lib/api/auth";
import { serverEnv } from "@/lib/env/server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { id } = await context.params;

  try {
    const arrayBuffer = await auth.storage.getFileDownload(serverEnv.storageBucketId, id);
    const headers = new Headers();
    headers.set("Content-Type", "font/ttf"); // or font/otf based on extension, but browser will sniff
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(arrayBuffer, { headers });
  } catch (error) {
    return new Response("Not found", { status: 404 });
  }
}
