"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, resetPasswordAction } from "@/app/auth/actions";
import type { AuthResult } from "@/app/auth/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

/**
 * Ask for a reset link.
 *
 * On success the form is replaced by the confirmation rather than kept on
 * screen, so nobody submits three times wondering whether it worked. The
 * message is the same whether or not the address has an account; see
 * requestPasswordResetAction for why.
 */
export function RequestResetForm() {
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(
    async (_prev, formData) => requestPasswordResetAction(formData),
    undefined
  );

  if (state && "ok" in state) {
    return (
      <div className="mt-6">
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {state.ok}
        </p>
        <p className="mt-6 text-center text-sm text-ink-soft">
          <Link href="/signin" className="font-medium text-brand-600 hover:text-brand-deep">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state && "error" in state && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-deep px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}

/**
 * Choose a new password with a token from the emailed link.
 *
 * The token rides in a hidden field rather than being read from the URL at
 * submit time, so it is captured once when the page loads.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(
    async (_prev, formData) => resetPasswordAction(formData),
    undefined
  );
  // Controlled: React 19 resets an uncontrolled form after a server action, so
  // a rejected password would silently clear both fields and leave the user
  // retyping from scratch.
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state && "error" in state && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
        />
        <p className="mt-1 text-xs text-ink-light">
          At least {MIN_PASSWORD_LENGTH} characters. A phrase of a few words is
          both stronger and easier to remember than a short password with
          symbols in it.
        </p>
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-deep px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Set new password"}
      </button>
      <p className="text-xs text-ink-light">
        Setting a new password signs out every device currently using this
        account.
      </p>
    </form>
  );
}
