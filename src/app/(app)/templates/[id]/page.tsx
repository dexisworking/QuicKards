// ============================================
// QUICKARDS — Template editor route
// ============================================
//
// The editor itself is a fixed full-viewport surface so it escapes the app
// shell's normal content width while this server route keeps data access and
// organization checks on the server.

import { notFound } from "next/navigation";

import Editor from "@/components/editor/Editor";
import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";
import { CardDocument } from "@/lib/design/schema";

type Props = { params: Promise<{ id: string }> };

export default async function TemplateEditorPage({ params }: Props) {
  const { id } = await params;
  const template = await scoped(await requireOrgScope()).templates.withCurrentDocument(id);
  if (!template) notFound();
  return <Editor templateId={template.id} name={template.name} version={template.version} document={CardDocument.parse(template.document)} />;
}
