"use client";

import { useState } from "react";
import { adminGrantProAction } from "@/app/(app)/account/actions";

export function AdminGrant() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(null);
    const target = (formData.get("email") as string) || "";
    const res = await adminGrantProAction(target);
    setPending(false);
    if (res.ok) {
      setMessage({ ok: true, text: `Pro granted to ${target}.` });
      setEmail("");
    } else {
      setMessage({ ok: false, text: res.error || "Could not grant Pro." });
    }
  }

  return (
    <form action={submit} className="mt-4 space-y-3">
      <label htmlFor="grant-email" className="block text-sm font-medium text-ink">
        Grant Pro to a user
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="grant-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="student@example.com"
          className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink focus:border-brand-600"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-deep px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Granting..." : "Grant Pro"}
        </button>
      </div>
      {message && (
        <p role="status" className={`text-xs ${message.ok ? "text-green-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
