import type { Metadata } from "next";
import Link from "next/link";

import AuthForm from "@/components/auth/AuthForm";
import Card from "@/components/ui/Card";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div>
      <Card className="p-6">
        <h1 className="text-lg font-semibold">Welcome back</h1>
        <p className="mb-5 mt-1 text-sm text-[var(--k-text-muted)]">
          Sign in to your workspace.
        </p>
        <AuthForm mode="sign-in" />
      </Card>
      <p className="mt-4 text-center text-sm text-[var(--k-text-muted)]">
        New to QuicKards?{" "}
        <Link href="/sign-up" className="font-medium text-[var(--k-accent)] hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
