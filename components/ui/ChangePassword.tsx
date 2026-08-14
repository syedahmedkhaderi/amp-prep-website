"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { changePasswordAction } from "@/app/(app)/account/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

/**
 * Password change form. Inputs are controlled because React resets an
 * uncontrolled form after a submit, which would wipe all three fields whenever
 * the server rejects the attempt.
 */
export function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setDone(false);
    const result = await changePasswordAction(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setDone(true);
  }

  return (
    <form action={onSubmit} className="mt-4 space-y-4">
      <Field
        id="currentPassword"
        label="Current password"
        autoComplete="current-password"
        value={current}
        onChange={setCurrent}
      />
      <Field
        id="newPassword"
        label="New password"
        autoComplete="new-password"
        value={next}
        onChange={setNext}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. A short sentence you will remember works well.`}
      />
      <Field
        id="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="text-sm text-green-700">
          Password changed. Any other device signed in to this account has been
          signed out.
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function Field({
  id,
  label,
  autoComplete,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full max-w-sm rounded-lg border border-surface-border px-3 py-2 text-sm text-ink focus:border-brand-600 focus:outline-none"
      />
      {hint && <p className="mt-1 text-xs text-ink-light">{hint}</p>}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-deep disabled:opacity-60"
    >
      {pending ? "Changing..." : "Change password"}
    </button>
  );
}
