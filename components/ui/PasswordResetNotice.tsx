"use client";

import { useSearchParams } from "next/navigation";

/**
 * Confirms a completed password reset on the sign-in page.
 *
 * The reset deliberately does not sign the user in, so without this they land
 * on a plain sign-in form with no sign that anything happened and no way to
 * tell success from a link that silently failed.
 *
 * Read from the query string on the client so the sign-in page stays static.
 */
export function PasswordResetNotice() {
  const done = useSearchParams().get("reset") === "1";
  if (!done) return null;

  return (
    <p
      role="status"
      className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
    >
      Your password has been changed, and every device that was signed in has
      been signed out. Sign in with your new password.
    </p>
  );
}
