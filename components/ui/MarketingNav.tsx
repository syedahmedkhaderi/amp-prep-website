"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Desktop navigation */}
      <nav aria-label="Primary" className="hidden items-center gap-6 text-sm md:flex">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={`transition-colors hover:text-brand-deep ${
              isActive(link.href) ? "font-medium text-brand-deep" : "text-ink-soft"
            }`}
          >
            {link.label}
          </Link>
        ))}
        <Link href="/signin" className="text-ink-soft transition-colors hover:text-brand-deep">
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-brand-deep px-4 py-2 font-medium text-white transition-colors hover:bg-brand-700"
        >
          Start free
        </Link>
      </nav>

      {/* Mobile menu toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-surface-border text-ink-soft md:hidden"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
        >
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {/* Mobile menu panel */}
      {open && (
        <div
          id="mobile-menu"
          className="absolute left-0 right-0 top-full z-20 border-b border-surface-border bg-white px-6 py-4 shadow-sm md:hidden"
        >
          <nav aria-label="Primary mobile" className="flex flex-col gap-3 text-sm">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`rounded-md px-2 py-1.5 transition-colors hover:bg-surface-panel ${
                  isActive(link.href) ? "font-medium text-brand-deep" : "text-ink-soft"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/signin"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1.5 text-ink-soft transition-colors hover:bg-surface-panel"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-lg bg-brand-deep px-4 py-2 text-center font-medium text-white transition-colors hover:bg-brand-700"
            >
              Start free
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
