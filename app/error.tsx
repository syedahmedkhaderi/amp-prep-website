"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Last-resort boundary for an unhandled render error.
 *
 * Shows the digest rather than the raw message: Next replaces production error
 * messages with a digest anyway, and printing internals to a user tells them
 * nothing useful while telling an attacker something. The digest is what lets a
 * report be matched to a server log.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-20">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-brand-deep">Something went wrong</h1>
        <p className="mt-3 text-ink-soft">
          This one is on us, not you. Your progress on any saved attempt is
          stored as you go, so nothing you have already answered is lost.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-surface-border px-5 py-2.5 text-sm text-ink-soft transition hover:border-brand-600 hover:text-brand-deep"
          >
            Back to dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 text-xs text-ink-light">
            If you report this, quote reference{" "}
            <code className="rounded bg-surface-panel px-1.5 py-0.5">{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}
