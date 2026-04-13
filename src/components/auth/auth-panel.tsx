"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export const AuthPanel = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    await runAuth("signin");
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-900">Sign in to QuicKards</h2>
      <p className="mt-1 text-sm text-zinc-600">Use your Appwrite account credentials to continue.</p>
      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-600"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-600"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            Sign in
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => runAuth("signup")}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
          >
            Sign up
          </button>
        </div>
        {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
      </form>
    </div>
  );
};
