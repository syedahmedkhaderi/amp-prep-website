import { getCurrentUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { signOutAction } from "@/app/auth/actions";
import { upgradeAction, downgradeAction } from "@/app/(app)/account/actions";
import Link from "next/link";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const entitlements = getEntitlements(user);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold text-brand-deep">Account</h1>

      {/* Profile */}
      <section className="mt-6 rounded-xl border border-surface-border bg-white p-6">
        <h2 className="font-semibold text-ink">Profile</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Name</dt>
            <dd className="text-ink">{user.fullName || "Not set"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Email</dt>
            <dd className="text-ink">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Role</dt>
            <dd className="text-ink capitalize">{user.role}</dd>
          </div>
        </dl>
      </section>

      {/* Plan */}
      <section className="mt-6 rounded-xl border border-surface-border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">Subscription</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            user.plan === "pro"
              ? "bg-brand-deep text-white"
              : "bg-surface-panel text-ink-soft"
          }`}>
            {user.plan.toUpperCase()}
          </span>
        </div>

        {entitlements.isPro ? (
          <div className="mt-4">
            <p className="text-sm text-ink-soft">
              You have unlimited practice and mocks, full AMP 2 access, and topic
              analytics.
            </p>
            <form action={downgradeAction} className="mt-4">
              <button
                type="submit"
                className="rounded-lg border border-surface-border px-5 py-2 text-sm text-ink-soft hover:border-red-400 hover:text-red-600"
              >
                Cancel subscription (revert to Free)
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-ink-soft">
              Upgrade to Pro for unlimited practice, AMP 2 content, full analytics,
              and 40+ practice papers.
            </p>
            <div className="mt-4 flex gap-3">
              <form action={upgradeAction}>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-deep px-5 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Upgrade to Pro ($10/month)
                </button>
              </form>
              <Link
                href="/pricing"
                className="rounded-lg border border-surface-border px-5 py-2 text-sm text-ink-soft hover:border-brand-600"
              >
                Compare plans
              </Link>
            </div>
            <p className="mt-3 text-xs text-ink-light">
              In production this opens a secure checkout through Lemon Squeezy.
              For local development, the upgrade is applied immediately.
            </p>
          </div>
        )}
      </section>

      {/* Sign out */}
      <section className="mt-6">
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-surface-border px-5 py-2 text-sm text-ink-soft hover:border-red-400 hover:text-red-600"
          >
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
