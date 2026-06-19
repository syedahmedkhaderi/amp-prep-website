import Link from "next/link";
import { SignUpForm } from "@/components/ui/AuthForms";

export const metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center text-2xl font-bold text-brand-deep mb-8">
          AMP Prep
        </Link>
        <div className="rounded-2xl border border-surface-border bg-white p-8">
          <h1 className="text-xl font-bold text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Start practicing in under two minutes. Free forever.
          </p>
          <SignUpForm />
          <p className="mt-6 text-center text-sm text-ink-soft">
            Already have an account?{" "}
            <Link href="/signin" className="font-medium text-brand-600 hover:text-brand-deep">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
