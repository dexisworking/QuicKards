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
import { presignDownload } from "@/lib/storage/presign";

type Props = { params: Promise<{ id: string }> };

export default async function TemplateEditorPage({ params }: Props) {
  const scope = await requireOrgScope();
  const { id } = await params;
  const repo = scoped(scope);
  const template = await repo.templates.withCurrentDocument(id);
  if (!template) notFound();

  const fonts = await repo.fonts.list();
  const fontFaces = await Promise.all(
    fonts.map(async (font) => ({
      id: font.id,
      family: font.family,
      weight: font.weight,
      style: font.style,
      href: await presignDownload(font.r2Key, { expiresIn: 900 }),
    })),
  );

  return (
    <Editor
      templateId={template.id}
      name={template.name}
      version={template.version}
      document={CardDocument.parse(template.document)}
      fonts={fontFaces}
    />
  );
}
