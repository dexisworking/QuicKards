import ComingInEditor from "@/components/app/ComingInEditor";

export default function NewTemplatePage() {
  return (
    <ComingInEditor
      title="The card editor is on the way"
      description="The canonical document model, shared SVG renderer, and render pipeline behind it are built and tested. The Canva-style editing surface lands in the next phase."
      backHref="/templates"
      backLabel="Back to templates"
    />
  );
}
