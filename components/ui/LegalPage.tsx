import type { ReactNode } from "react";

/**
 * Shared shell for the policy pages, so Terms, Privacy and Contact read as one
 * document set rather than three pages that happen to share a footer.
 */
export function LegalPage({
  title,
  intro,
  lastUpdated,
  children,
}: {
  title: string;
  intro?: string;
  lastUpdated?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-brand-deep">{title}</h1>
      {lastUpdated && (
        <p className="mt-2 text-sm text-ink-light">Last updated: {lastUpdated}</p>
      )}
      {intro && <p className="mt-6 text-ink-soft">{intro}</p>}
      <div className="mt-8 space-y-8">{children}</div>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-ink">{heading}</h2>
      <div className="mt-3 space-y-3 text-ink-soft [&_a]:text-brand-700 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}
