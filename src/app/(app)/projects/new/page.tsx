// ============================================
// QUICKARDS — Project creation form
// ============================================
//
// A project chooses a saved template before data is uploaded, so every batch
// has a known renderer input and the render endpoint can pin its version.

import NewProjectForm from "@/components/editor/NewProjectForm";
import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";

export default async function NewProjectPage() {
  const templates = await scoped(await requireOrgScope()).templates.list();
  return <NewProjectForm templates={templates.map(({ id, name }) => ({ id, name }))} />;
}
