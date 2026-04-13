import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { ProjectWorkspace, type ProjectPayload } from "@/components/projects/project-workspace";
import { getCurrentUser } from "@/lib/api/auth";
import { getAppwriteSessionServices } from "@/lib/appwrite/client";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toAssetRecord, toCardDataRecord, toJobRecord, toProjectRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";

type PageContext = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage(context: PageContext) {
  const { id } = await context.params;
  const current = await getCurrentUser();

  if (!current.user || !current.sessionSecret) {
    redirect("/");
  }

  const { databases } = getAppwriteSessionServices(current.sessionSecret);

  let project;
  try {
    const projectDocument = await databases.getDocument(serverEnv.appwriteDatabaseId, appwriteCollections.projects, id);
    project = toProjectRecord(projectDocument);
  } catch {
    notFound();
  }

  if (project.user_id !== current.user.$id) {
    notFound();
  }

  const [cardDataResult, assetsResult, jobsResult] = await Promise.all([
    databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.cardData, [
      Query.equal("projectId", id),
      Query.orderAsc("$createdAt"),
      Query.limit(5000),
    ]),
    databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.assets, [
      Query.equal("projectId", id),
      Query.orderDesc("$createdAt"),
      Query.limit(5000),
    ]),
    databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.jobs, [
      Query.equal("projectId", id),
      Query.orderDesc("$createdAt"),
      Query.limit(200),
    ]),
  ]);

  const initialData: ProjectPayload = {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
    },
    cardData: cardDataResult.documents.map((document) => toCardDataRecord(document)),
    assets: assetsResult.documents.map((document) => toAssetRecord(document)),
    jobs: jobsResult.documents.map((document) => toJobRecord(document)),
  };

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{project.name}</h1>
            <p className="text-sm text-zinc-600">Project status: {project.status}</p>
          </div>
          <Link href="/" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
            Back
          </Link>
        </div>
        <ProjectWorkspace projectId={project.id} initialData={initialData} />
      </div>
    </main>
  );
}
