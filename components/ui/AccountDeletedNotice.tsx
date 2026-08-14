"use client";

import { useSearchParams } from "next/navigation";

/**
 * Confirms an account deletion on the page the user lands on afterwards.
 *
 * Read on the client from the query string rather than as a server searchParam,
 * so the home page stays statically rendered. Deleting an account and being
 * dropped on the marketing page with no acknowledgement reads like a failure.
 */
export function AccountDeletedNotice() {
  const deleted = useSearchParams().get("deleted") === "1";
  if (!deleted) return null;

  return (
    <div
      role="status"
      className="border-b border-surface-border bg-surface-panel px-6 py-4"
    >
      <p className="mx-auto max-w-6xl text-sm text-ink-soft">
        Your account and all of your practice history have been permanently
        deleted. Thanks for using AMP Prep.
      </p>
    </div>
  );
}
