"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ResourceItem = {
  id: string;
  name: string;
  created_at: string;
  status?: string;
};

type ResourceListProps = {
  title: string;
  type: "project" | "template";
  items: ResourceItem[];
};

const EXPIRY_MS = 36 * 60 * 60 * 1000;

const getRemainingLabel = (createdAt: string) => {
  const remaining = Math.max(0, Date.parse(createdAt) + EXPIRY_MS - Date.now());
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
};

export const ResourceList = ({ title, type, items }: ResourceListProps) => {
  const router = useRouter();

  const deleteResource = async (id: string) => {
    const confirmed = window.confirm(`Delete this ${type}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }
    const endpoint = type === "project" ? `/api/v1/projects/${id}` : `/api/v1/templates/${id}`;
    await fetch(endpoint, { method: "DELETE" });
    router.refresh();
  };

  return (
    <section className="swiss-section p-5">
      <p className="swiss-kicker">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-600">No {type}s yet.</p>
        ) : (
          items.map((item) => {
            const href = type === "project" ? `/projects/${item.id}` : `/templates/${item.id}`;
            return (
              <div key={item.id} className="rounded-2xl border border-zinc-300 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <Link href={href} className="text-sm font-medium text-zinc-900 hover:underline">
                    {item.name}
                  </Link>
                  <Button type="button" onClick={() => deleteResource(item.id)} title={`Delete ${type}`} className="px-2 py-1">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>{item.status ?? new Date(item.created_at).toLocaleString()}</span>
                  <span className="text-amber-600">Expires in {getRemainingLabel(item.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
