import Link from "next/link";
import { SignInForm } from "@/components/ui/AuthForms";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center text-2xl font-bold text-brand-deep mb-8">
          AMP Prep
        </Link>
        <div className="rounded-2xl border border-surface-border bg-white p-8">
          <h1 className="text-xl font-bold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Sign in to continue practicing.
          </p>
          <SignInForm />
          <p className="mt-6 text-center text-sm text-ink-soft">
            New here?{" "}
            <Link href="/signup" className="font-medium text-brand-600 hover:text-brand-deep">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
