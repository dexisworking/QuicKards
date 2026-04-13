"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
    <form onSubmit={onSubmit} className="swiss-section space-y-3 p-5">
      <p className="swiss-kicker">Start a pipeline</p>
      <h2 className="text-base font-semibold text-zinc-900">New project</h2>
      <input
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Project name"
        className="swiss-input"
      />
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
      <button
        disabled={isLoading}
        className="swiss-btn w-full"
      >
        Create project
      </button>
      <p className="text-xs text-zinc-500">Attach a template now or assign one later while editing.</p>
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
    </form>
  );
};
