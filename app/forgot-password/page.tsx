import Link from "next/link";
import type { Metadata } from "next";
import { RequestResetForm } from "@/components/ui/PasswordResetForms";
import { isMailerConfigured } from "@/lib/mailer";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

/**
 * If no mailer is configured the form is not shown at all.
 *
 * Rendering it anyway would take the user's address, tell them a link was on
 * its way, and send nothing — which is worse than admitting the feature is not
 * available, because they would wait instead of writing in.
 */
export default function ForgotPasswordPage() {
  const canSend = isMailerConfigured();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center text-2xl font-bold text-brand-deep mb-8">
          AMP Prep
        </Link>
        <div className="rounded-2xl border border-surface-border bg-white p-8">
          <h1 className="text-xl font-bold text-ink">Reset your password</h1>

          {canSend ? (
            <>
              <p className="mt-1 text-sm text-ink-soft">
                Enter the email address on your account and we will send you a
                link to choose a new password.
              </p>
              <RequestResetForm />
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-soft">
                Automatic password reset is not available yet, because this site
                does not send email.
              </p>
              <p className="mt-4 rounded-lg border border-surface-border bg-surface-panel px-4 py-3 text-sm text-ink">
                Email{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium underline">
                  {CONTACT_EMAIL}
                </a>{" "}
                from the address on your account and your password will be reset
                manually.
              </p>
            </>
          )}

          <p className="mt-6 text-center text-sm text-ink-soft">
            <Link href="/signin" className="font-medium text-brand-600 hover:text-brand-deep">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
