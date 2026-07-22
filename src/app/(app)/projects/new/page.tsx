import ComingInEditor from "@/components/app/ComingInEditor";

export default function NewProjectPage() {
  return (
    <ComingInEditor
      title="Project creation is on the way"
      description="CSV import, photo mapping, and the render queue are built and tested end to end. The project workspace UI that drives them lands alongside the editor."
      backHref="/projects"
      backLabel="Back to projects"
    />
  );
}
