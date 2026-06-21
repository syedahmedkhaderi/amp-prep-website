import Link from "next/link";
import { MarketingNav } from "@/components/ui/MarketingNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-surface-border bg-white/95 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md text-lg font-bold text-brand-deep"
        >
          AMP Prep
        </Link>
        <MarketingNav />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-surface-border bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <p className="text-lg font-bold text-brand-deep">AMP Prep</p>
            <p className="mt-2 text-sm text-ink-soft">
              An independent study tool that helps students prepare for the UDST
              Academic Mathematics Placement tests.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link href="/pricing" className="text-ink-soft hover:text-brand-deep">
              Pricing
            </Link>
            <Link href="/about" className="text-ink-soft hover:text-brand-deep">
              About
            </Link>
            <Link href="/faq" className="text-ink-soft hover:text-brand-deep">
              FAQ
            </Link>
            <Link href="/signin" className="text-ink-soft hover:text-brand-deep">
              Sign in
            </Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-surface-border pt-6">
          <p className="text-xs leading-relaxed text-ink-light">
            AMP Prep is an independent study tool. It is not affiliated with,
            endorsed by, or connected to the University of Doha for Science and
            Technology. UDST is a trademark of its respective owner. The
            platform helps students prepare for the UDST AMP tests but does not
            claim any official status.
          </p>
          <p className="mt-4 text-xs text-ink-light">
            (c) {new Date().getFullYear()} AMP Prep. All practice questions are
            original items written for this platform.
          </p>
        </div>
      </div>
    </footer>
  );
}
