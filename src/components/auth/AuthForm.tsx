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
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = isSignUp
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Please try again.");
      setBusy(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
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

      <Button type="submit" fullWidth loading={busy}>
        {isSignUp ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}
