import Link from "next/link";
import { MarketingNav } from "@/components/ui/MarketingNav";
import { Logo } from "@/components/ui/Logo";
import {
  EDUCATIONAL_DISCLAIMER,
  NON_AFFILIATION,
  OPERATOR_NAME,
} from "@/lib/legal";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-surface-border bg-white/95 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="rounded-md" aria-label="AMP Prep home">
          <Logo />
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
            <Logo />
            <p className="mt-3 text-sm text-ink-soft">
              An independent study tool that helps students prepare for the UDST
              Academic Mathematics Placement tests.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-12 gap-y-6 text-sm">
            <nav className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-light">
                Product
              </p>
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
            <nav className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-light">
                Legal
              </p>
              <Link href="/terms" className="text-ink-soft hover:text-brand-deep">
                Terms
              </Link>
              <Link href="/privacy" className="text-ink-soft hover:text-brand-deep">
                Privacy
              </Link>
              <Link href="/contact" className="text-ink-soft hover:text-brand-deep">
                Contact
              </Link>
            </nav>
          </div>
        </div>
        <div className="mt-8 border-t border-surface-border pt-6">
          <p className="text-xs leading-relaxed text-ink-light">{NON_AFFILIATION}</p>
          <p className="mt-3 text-xs leading-relaxed text-ink-light">
            {EDUCATIONAL_DISCLAIMER}
          </p>
          <p className="mt-4 text-xs text-ink-light">
            (c) {new Date().getFullYear()} {OPERATOR_NAME}. All practice
            questions are original items written for this platform.
          </p>
        </div>
      </div>
    </footer>
  );
}
