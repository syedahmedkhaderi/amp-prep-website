import Link from "next/link";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/ui/PasswordResetForms";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

/**
 * The page the emailed link opens.
 *
 * The token is not validated here. Checking it on render would mean a preview
 * fetch — some mail clients and security scanners follow links automatically —
 * could report it as spent before the person ever saw the page. It is checked
 * once, at submit, where it is also consumed.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center text-2xl font-bold text-brand-deep mb-8">
          AMP Prep
        </Link>
        <div className="rounded-2xl border border-surface-border bg-white p-8">
          <h1 className="text-xl font-bold text-ink">Choose a new password</h1>

          {token ? (
            <>
              <p className="mt-1 text-sm text-ink-soft">
                This link works once and expires 60 minutes after it was
                requested.
              </p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-soft">
                This link is missing its token. It may have been broken across
                two lines by your email client.
              </p>
              <p className="mt-6 text-center text-sm text-ink-soft">
                <Link
                  href="/forgot-password"
                  className="font-medium text-brand-600 hover:text-brand-deep"
                >
                  Request a new link
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
