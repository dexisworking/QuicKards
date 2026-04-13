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
    <form onSubmit={onSubmit} className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
      <h2 className="text-base font-semibold text-zinc-900">New project</h2>
      <input
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Project name"
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-600"
      />
      <select
        value={templateId}
        onChange={(event) => setTemplateId(event.target.value)}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-600"
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
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        Create project
      </button>
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
    </form>
  );
};
