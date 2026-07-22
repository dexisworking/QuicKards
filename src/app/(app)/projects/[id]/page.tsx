// ============================================
// QUICKARDS — Project workspace route
// ============================================
//
// The server establishes project ownership before the interactive workspace
// drives the already-built CSV, ZIP, and asynchronous render endpoints.

import { notFound } from "next/navigation";

import ProjectWorkspace from "@/components/editor/ProjectWorkspace";
import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";

type Props = { params: Promise<{ id: string }> };
export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const project = await scoped(await requireOrgScope()).projects.byId(id);
  if (!project) notFound();
  return <ProjectWorkspace project={{ id: project.id, name: project.name, status: project.status }} />;
}
