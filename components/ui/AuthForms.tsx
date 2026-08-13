"use client";

import { useActionState, useState } from "react";
import { signUpAction, signInAction } from "@/app/auth/actions";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Z" />
      <circle cx="10" cy="10" r="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 10s3-5.5 8-5.5c1.68 0 3.09.42 4.24 1.02M18 10s-1.09 2.02-3.06 3.5M4.6 5.6 2 8m3.94 4.4L2 16m14-11.5L4.5 15.5" />
    </svg>
  );
}

function PasswordField({
  id,
  label,
  helperText,
  minLength,
}: {
  id: string;
  label: string;
  helperText?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          className="w-full rounded-lg border border-surface-border px-3 py-2 pr-10 text-ink focus:border-brand-600"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-light hover:text-ink"
        >
          <EyeIcon open={visible} />
        </button>
      </div>
      {helperText && <p className="mt-1 text-xs text-ink-light">{helperText}</p>}
    </div>
  );
}

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: any, formData: FormData) => {
      const res = await signUpAction(formData);
      return res;
    },
    null
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-ink">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-ink focus:border-brand-600"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-ink focus:border-brand-600"
        />
      </div>
      <PasswordField id="password" label="Password" minLength={6} helperText="At least 6 characters." />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-deep px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}

export function SignInForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: any, formData: FormData) => {
      const res = await signInAction(formData);
      return res;
    },
    null
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
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
          className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-ink focus:border-brand-600"
        />
      </div>
      <PasswordField id="password" label="Password" />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-deep px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
