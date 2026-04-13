import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { requireUser } from "@/lib/api/auth";
import { ensureProjectAccess } from "@/lib/api/project";
import { jsonError, jsonOk } from "@/lib/api/response";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toJobRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";
import { buildCombinedPdf, buildOutputZip, renderCardPng } from "@/lib/render/engine";
import { loadRenderProject } from "@/lib/render/load-project";
import { encodeFileId } from "@/lib/storage/file-id";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const project = await ensureProjectAccess(auth.databases, id, auth.user.$id);
  if ("errorResponse" in project) {
    return project.errorResponse;
  }

  let jobId = "";

  try {
    const createdJobDocument = await auth.databases.createDocument(
      serverEnv.appwriteDatabaseId,
      appwriteCollections.jobs,
      ID.unique(),
      {
        userId: auth.user.$id,
        projectId: id,
        status: "pending",
        outputFileId: null,
        errorMessage: null,
        completedAt: null,
      },
    );

    jobId = createdJobDocument.$id;
    const renderProject = await loadRenderProject(auth.databases, auth.storage, id);
    if (renderProject.rows.length === 0) {
      throw new Error("No card data found");
    }

    const renderedCards: Array<{ cardId: string; png: Buffer }> = [];
    for (const row of renderProject.rows) {
      const imageBuffer = await renderProject.resolveCardImage(row.card_id);
      const png = await renderCardPng({
        template: renderProject.template,
        backgroundBuffer: renderProject.backgroundBuffer,
        row,
        imageBuffer,
      });
      renderedCards.push({ cardId: row.card_id, png });
    }

    const combinedPdf = await buildCombinedPdf(
      renderedCards.map((card) => card.png),
      renderProject.template.width,
      renderProject.template.height,
    );

    const zipBuffer = await buildOutputZip([
      { name: "combined.pdf", data: combinedPdf },
      ...renderedCards.map((card) => ({ name: `cards/${card.cardId}.png`, data: card.png })),
    ]);

    const outputFile = await auth.storage.createFile(
      serverEnv.outputBucketId,
      ID.unique(),
      InputFile.fromBuffer(zipBuffer, `cards-${jobId}.zip`),
    );

    const updatedJobDocument = await auth.databases.updateDocument(
      serverEnv.appwriteDatabaseId,
      appwriteCollections.jobs,
      jobId,
      {
        status: "completed",
        outputFileId: outputFile.$id,
        completedAt: new Date().toISOString(),
        errorMessage: null,
      },
    );

    await auth.databases.updateDocument(serverEnv.appwriteDatabaseId, appwriteCollections.projects, id, { status: "rendered" });

    return jsonOk({
      job: toJobRecord(updatedJobDocument),
      download: `/api/v1/downloads/${encodeFileId(outputFile.$id)}`,
      renderedCards: renderedCards.length,
    });
  } catch (error) {
    if (jobId) {
      await auth.databases.updateDocument(serverEnv.appwriteDatabaseId, appwriteCollections.jobs, jobId, {
        status: "failed",
        errorMessage: String(error),
        completedAt: new Date().toISOString(),
      });
    }
    return jsonError("Render failed", 500, String(error));
  }
}
