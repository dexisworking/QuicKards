import { requireUser } from "@/lib/api/auth";
import { ensureProjectAccess } from "@/lib/api/project";
import { safeJson } from "@/lib/api/request";
import { jsonError, jsonOk } from "@/lib/api/response";
import { renderCardPng } from "@/lib/render/engine";
import { loadRenderProject } from "@/lib/render/load-project";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PreviewBody = {
  count?: number;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const project = await ensureProjectAccess(auth.databases, id, auth.user.$id);
  if ("errorResponse" in project) {
    return project.errorResponse;
  }

  const body = await safeJson<PreviewBody>(request);
  const count = Math.min(5, Math.max(1, body?.count ?? 5));

  try {
    const renderProject = await loadRenderProject(auth.databases, auth.storage, id);
    if (renderProject.rows.length === 0) {
      return jsonError("No card data available. Upload CSV first.", 400);
    }

    const previews = [];
    for (const row of renderProject.rows.slice(0, count)) {
      const imageBuffer = await renderProject.resolveCardImage(row.card_id);
      const png = await renderCardPng({
        template: renderProject.template,
        backgroundBuffer: renderProject.backgroundBuffer,
        row,
        imageBuffer,
      });

      previews.push({
        card_id: row.card_id,
        image: `data:image/png;base64,${png.toString("base64")}`,
      });
    }

    return jsonOk({ previews });
  } catch (error) {
    return jsonError("Preview render failed", 500, String(error));
  }
}
