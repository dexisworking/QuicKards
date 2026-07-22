// ============================================
// QUICKARDS — Auth form
// ============================================
//
// Shared sign-in / sign-up form on the Better Auth browser client. On success
// the user lands on the dashboard; the (app) layout creates their workspace on
// that first authenticated render.

"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import Button from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import { authClient } from "@/lib/auth/client";

export default function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"password" | "google" | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy("password");
    setError(null);

    const result = isSignUp
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Please try again.");
      setBusy(null);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function signInWithGoogle() {
    setBusy("google");
    setError(null);
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in is unavailable. Please try again.");
      setBusy(null);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {isSignUp && (
        <Field label="Name" htmlFor="name">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            placeholder="Jane Doe"
          />
        </Field>
      )}

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" htmlFor="password" error={error}>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={8}
          placeholder={isSignUp ? "At least 8 characters" : "••••••••"}
        />
      </Field>

      <Button type="submit" fullWidth loading={busy === "password"} disabled={busy === "google"}>
        {isSignUp ? "Create account" : "Sign in"}
      </Button>

      <div className="flex items-center gap-3 text-xs text-[var(--k-text-faint)]">
        <div className="h-px flex-1 bg-[var(--k-border)]" />
        <span>or</span>
        <div className="h-px flex-1 bg-[var(--k-border)]" />
      </div>

      <Button
        type="button"
        variant="secondary"
        fullWidth
        loading={busy === "google"}
        disabled={busy === "password"}
        onClick={signInWithGoogle}
        icon={<GoogleMark />}
      >
        Continue with Google
      </Button>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path fill="#4285F4" d="M21.35 12.2c0-.71-.06-1.23-.2-1.77H12v3.37h5.37c-.11.84-.71 2.11-2.04 2.96l-.02.11 2.96 2.29.2.02c1.84-1.69 2.88-4.18 2.88-6.98Z" />
      <path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.36l-3.07-2.42c-.82.57-1.92.97-3.38.97a5.84 5.84 0 0 1-5.52-4.03l-.1.01-3.08 2.38-.04.1A9.75 9.75 0 0 0 12 21.7Z" />
      <path fill="#FBBC05" d="M6.48 13.86A5.98 5.98 0 0 1 6.17 12c0-.65.12-1.28.3-1.86v-.12L3.36 7.6l-.1.05A9.7 9.7 0 0 0 2.3 12c0 1.57.38 3.05.96 4.35l3.22-2.49Z" />
      <path fill="#EA4335" d="M12 6.1c1.84 0 3.08.8 3.79 1.46l2.77-2.7C16.83 3.25 14.63 2.3 12 2.3a9.75 9.75 0 0 0-8.74 5.35l3.21 2.49A5.86 5.86 0 0 1 12 6.1Z" />
    </svg>
  );
}
