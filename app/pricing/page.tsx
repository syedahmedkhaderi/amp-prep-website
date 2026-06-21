import { SiteHeader, SiteFooter } from "@/components/ui/SiteChrome";
import Link from "next/link";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 mx-auto max-w-5xl px-6 py-16 w-full">
        <h1 className="text-3xl font-bold text-brand-deep text-center">
          Simple pricing
        </h1>
        <p className="mt-4 text-center text-ink-soft">
          Start free. Upgrade when you need more practice or AMP 2 content.
        </p>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-surface-border bg-white p-8">
            <h2 className="text-xl font-bold text-ink">Free</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Enough to get a real feel for the test.
            </p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-brand-deep">$0</span>
              <span className="text-ink-soft">/month</span>
            </div>
            <ul className="mt-8 space-y-3 text-sm">
              <Feature text="Browse all AMP 1 topics" included />
              <Feature text="Up to 20 practice questions per day" included />
              <Feature text="Full worked solutions on every question" included />
              <Feature text="One timed AMP 1 mock per week (60 questions, 120 minutes)" included />
              <Feature text="AMP 2 precalculus content" included={false} />
              <Feature text="Unlimited practice and mocks" included={false} />
              <Feature text="Topic analytics and weak area targeting" included={false} />
            </ul>
            <Link
              href="/signup"
              className="mt-8 block rounded-lg border border-brand-deep px-6 py-3 text-center font-medium text-brand-deep hover:bg-surface-panel"
            >
              Start free
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border-2 border-brand-deep bg-white p-8 relative">
            <div className="absolute -top-3 left-8 rounded-full bg-brand-deep px-3 py-1 text-xs font-medium text-white">
              Recommended
            </div>
            <h2 className="text-xl font-bold text-ink">Pro</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Everything you need for serious preparation.
            </p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-brand-deep">$10</span>
              <span className="text-ink-soft">/month</span>
            </div>
            <p className="mt-1 text-xs text-ink-light">
              Or $24 for a 3 month exam season pass (20% saving).
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              <Feature text="Everything in Free" included />
              <Feature text="Unlimited practice questions, no daily cap" included />
              <Feature text="Unlimited timed mocks for AMP 1 and AMP 2" included />
              <Feature text="Full AMP 2 precalculus content (800+ questions)" included />
              <Feature text="Topic analytics and weak area targeting with trends" included />
              <Feature text="Retry only the questions you got wrong" included />
              <Feature text="40+ full length practice papers" included />
            </ul>
            <Link
              href="/signup"
              className="mt-8 block rounded-lg bg-brand-deep px-6 py-3 text-center font-medium text-white hover:bg-brand-700"
            >
              Start free, upgrade anytime
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-ink-light">
          All prices in USD. About 36 QAR per month at current rates. Cancel
          anytime. Payments processed securely by Lemon Squeezy.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

function Feature({ text, included }: { text: string; included: boolean }) {
  return (
    <li className={`flex items-start gap-2 ${included ? "text-ink" : "text-ink-light"}`}>
      <span className={`mt-0.5 shrink-0 ${included ? "text-green-600" : "text-ink-light"}`}>
        <span className="sr-only">{included ? "Included:" : "Not included:"}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          {included ? (
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0Z"
              clipRule="evenodd"
            />
          ) : (
            <path
              fillRule="evenodd"
              d="M10 8.6 6.4 5 5 6.4 8.6 10 5 13.6 6.4 15 10 11.4 13.6 15 15 13.6 11.4 10 15 6.4 13.6 5 10 8.6Z"
              clipRule="evenodd"
            />
          )}
        </svg>
      </span>
      <span>{text}</span>
    </li>
  );
}
