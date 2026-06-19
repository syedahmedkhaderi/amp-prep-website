"use client";

import { useActionState } from "react";
import { signUpAction, signInAction } from "@/app/auth/actions";

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
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-ink focus:border-brand-600"
        />
        <p className="mt-1 text-xs text-ink-light">At least 6 characters.</p>
      </div>
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
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-ink focus:border-brand-600"
        />
      </div>
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
