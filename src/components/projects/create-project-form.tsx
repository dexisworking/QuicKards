"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Rocket } from "lucide-react";

type TemplateOption = {
  id: string;
  name: string;
};

type Props = {
  templates: TemplateOption[];
};

export const CreateProjectForm = ({ templates }: Props) => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const response = await fetch("/api/v1/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        template_id: templateId || null,
      }),
    });
    const payload = (await response.json()) as { project?: { id: string }; error?: string };
    setIsLoading(false);

    if (!response.ok || !payload.project) {
      setMessage(payload.error ?? "Could not create project");
      return;
    }

    router.push(`/projects/${payload.project.id}`);
  };

  return (
    <form onSubmit={onSubmit} className="swiss-section-accent space-y-3 p-5">
      <p className="swiss-kicker">Start a pipeline</p>
      <h2 className="text-base font-semibold text-[var(--foreground)]">New project</h2>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Project name</label>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Spring Fest 2026"
          className="swiss-input"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Template</label>
        <select
          value={templateId}
          onChange={(event) => setTemplateId(event.target.value)}
          className="swiss-select"
        >
          <option value="">No template yet</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </div>

      <button disabled={isLoading} className="swiss-btn w-full">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
        Create project
      </button>

      <p className="text-xs text-[var(--muted-2)]">Attach a template now or assign one later while editing.</p>
      {message ? (
        <div className="rounded-lg bg-[var(--danger-light)] px-3 py-2 text-sm text-[var(--danger)]">
          {message}
        </div>
      ) : null}
    </form>
  );
};
