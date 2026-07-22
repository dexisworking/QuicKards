import type { Metadata } from "next";
import Link from "next/link";

import AuthForm from "@/components/auth/AuthForm";
import Card from "@/components/ui/Card";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <div>
      <Card className="p-6">
        <h1 className="text-lg font-semibold">Create your account</h1>
        <p className="mb-5 mt-1 text-sm text-[var(--k-text-muted)]">
          A personal workspace is set up automatically.
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
