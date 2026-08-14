"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteAccountAction } from "@/app/(app)/account/actions";

/**
 * Account deletion, behind two deliberate steps: the form is hidden until the
 * user asks for it, and it requires the password. Deletion is irreversible and
 * sits on the same page as "Sign out", so it should be hard to hit by accident.
 */
export function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const result = await deleteAccountAction(formData);
    // Only reached when the action returned instead of redirecting, i.e. it
    // failed. React resets an uncontrolled form after a submit, so the password
    // field is controlled: otherwise a mistyped password wipes the input and
    // the user has to start over.
    if (result?.error) setError(result.error);
  }

  if (!confirming) {
    return (
      <div>
        <p className="text-sm text-ink-soft">
          Deleting your account removes your profile and every practice attempt
          and answer you have recorded. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-4 rounded-lg border border-surface-border px-5 py-2 text-sm text-ink-soft transition hover:border-red-400 hover:text-red-600"
        >
          Delete my account
        </button>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <p className="text-sm text-ink-soft">
        This permanently deletes your account, your attempts, and your answers.
        Enter your password to confirm.
      </p>

      <div>
        <label
          htmlFor="delete-password"
          className="block text-sm font-medium text-ink"
        >
          Password
        </label>
        <input
          id="delete-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-lg border border-surface-border px-3 py-2 text-sm text-ink focus:border-brand-600 focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <DeleteButton />
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError(null);
            setPassword("");
          }}
          className="rounded-lg border border-surface-border px-5 py-2 text-sm text-ink-soft hover:border-brand-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? "Deleting..." : "Permanently delete my account"}
    </button>
  );
}
