"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="swiss-section w-full max-w-md p-6">
      <p className="swiss-kicker">Workspace access</p>
      <h2 className="mt-1 text-xl font-semibold text-zinc-900">
        {mode === "signin" ? "Sign in to continue" : "Create your account"}
      </h2>
      <p className="mt-1 text-sm text-zinc-600">Manage templates, data imports, and render jobs inside your private dashboard.</p>
      <div className="mt-4 grid grid-cols-2 border border-zinc-300 text-sm">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={mode === "signin" ? "bg-zinc-900 px-3 py-2 text-white" : "px-3 py-2 hover:bg-zinc-50"}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={mode === "signup" ? "bg-zinc-900 px-3 py-2 text-white" : "px-3 py-2 hover:bg-zinc-50"}
        >
          Sign up
        </button>
      </div>
      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="swiss-input"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="swiss-input"
        />
        <button type="submit" disabled={isLoading} className="swiss-btn w-full">
          {mode === "signin" ? "Enter workspace" : "Create account"}
        </button>
        {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
      </form>
    </div>
  );
};
