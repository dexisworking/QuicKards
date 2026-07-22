import type { Metadata } from "next";
import Link from "next/link";

import AuthForm from "@/components/auth/AuthForm";
import Card from "@/components/ui/Card";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div>
      <Card className="p-6 sm:p-8">
        <p className="qk-kicker">Welcome back</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Sign in to QuicKards</h1>
        <p className="mb-7 mt-2 text-sm leading-6 text-[var(--k-text-muted)]">
          Pick up where your last card batch left off.
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
