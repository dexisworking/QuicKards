"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, FolderKanban, Layers, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

  const TypeIcon = type === "project" ? FolderKanban : Layers;
  const dotColor = type === "project" ? "swiss-dot-accent" : "swiss-dot-success";

  return (
    <section className="swiss-section p-5">
      <div className="flex items-center gap-2">
        <TypeIcon className="h-4 w-4 text-[var(--muted)]" />
        <p className="swiss-kicker">{title}</p>
      </div>

      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-2)]">
              <TypeIcon className="h-5 w-5 text-[var(--muted-2)]" />
            </div>
            <p className="text-sm text-[var(--muted)]">No {type}s yet.</p>
          </div>
        ) : (
          <AnimatePresence>
            {items.map((item, index) => {
              const href = type === "project" ? `/projects/${item.id}` : `/templates/${item.id}`;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ delay: index * 0.04, duration: 0.25 }}
                  className="group rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 transition-all hover:border-[var(--line-2)] hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`swiss-dot ${dotColor}`} />
                      <Link
                        href={href}
                        className="text-sm font-medium text-[var(--foreground)] transition-colors hover:text-[var(--accent)]"
                      >
                        {item.name}
                      </Link>
                    </div>
                    <Button
                      type="button"
                      onClick={() => deleteResource(item.id)}
                      title={`Delete ${type}`}
                      variant="ghost"
                      size="sm"
                      className="px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>{item.status ?? new Date(item.created_at).toLocaleString()}</span>
                    <span className="swiss-badge swiss-badge-warning">
                      <Clock className="h-3 w-3" />
                      {getRemainingLabel(item.created_at)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
};
