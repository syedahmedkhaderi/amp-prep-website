"use client";

import { useState } from "react";

export function UpgradeButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Could not start checkout.");
        setPending(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start checkout. Please try again.");
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={pending}
        className="rounded-lg bg-brand-deep px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Starting checkout..." : "Upgrade to Pro ($10/month)"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
