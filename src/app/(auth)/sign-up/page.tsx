import type { Metadata } from "next";
import Link from "next/link";

import AuthForm from "@/components/auth/AuthForm";
import Card from "@/components/ui/Card";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <div>
      <Card className="p-6 sm:p-8">
        <p className="qk-kicker">Start creating</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Create your workspace</h1>
        <p className="mb-7 mt-2 text-sm leading-6 text-[var(--k-text-muted)]">
          Your personal workspace is ready as soon as you sign up.
        </p>
        <AuthForm mode="sign-up" />
      </Card>
      <p className="mt-4 text-center text-sm text-[var(--k-text-muted)]">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-[var(--k-accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
