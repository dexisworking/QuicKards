"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export const AuthPanel = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runAuth = async (mode: "signin" | "signup") => {
    setIsLoading(true);
    setMessage(null);
    const response = await fetch(mode === "signin" ? "/api/v1/auth/signin" : "/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const result = (await response.json()) as { error?: string };

    setIsLoading(false);
    if (!response.ok) {
      setMessage(result.error ?? "Authentication failed");
      return;
    }

    setMessage(mode === "signup" ? "Account created." : "Signed in.");
    router.refresh();
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await runAuth(mode);
  };

  return (
    <div className="swiss-section w-full max-w-md overflow-hidden">
      {/* Accent top bar */}
      <div className="h-1" style={{ background: "var(--accent-gradient)" }} />

      <div className="p-6">
        <p className="swiss-kicker">Workspace access</p>
        <h2 className="mt-1.5 text-xl font-bold tracking-tight text-[var(--foreground)]">
          {mode === "signin" ? "Sign in to continue" : "Create your account"}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage templates, data imports, and render jobs inside your private dashboard.
        </p>

        {/* Tab switcher */}
        <div className="relative mt-5 flex rounded-lg bg-[var(--surface-2)] p-1">
          <motion.div
            className="absolute inset-y-1 rounded-md bg-[var(--accent)] shadow-sm"
            style={{ width: "50%" }}
            animate={{ x: mode === "signin" ? 0 : "100%" }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`relative z-10 flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "signin" ? "text-white" : "text-[var(--muted)]"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`relative z-10 flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "signup" ? "text-white" : "text-[var(--muted)]"
            }`}
          >
            Sign up
          </button>
        </div>

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Email</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="swiss-input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="swiss-input"
            />
          </div>
          <button type="submit" disabled={isLoading} className="swiss-btn w-full">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {mode === "signin" ? "Enter workspace" : "Create account"}
          </button>
          {message ? (
            <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--muted)]">
              {message}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
};
