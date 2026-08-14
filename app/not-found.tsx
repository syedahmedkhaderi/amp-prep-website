import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/ui/SiteChrome";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink-light">
            404
          </p>
          <h1 className="mt-2 text-3xl font-bold text-brand-deep">
            That page does not exist
          </h1>
          <p className="mt-3 text-ink-soft">
            The link may be out of date, or the address may have a typo in it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Go to the home page
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-surface-border px-5 py-2.5 text-sm text-ink-soft transition hover:border-brand-600 hover:text-brand-deep"
            >
              Go to your dashboard
            </Link>
          </div>
          <p className="mt-8 text-sm text-ink-light">
            If you followed a link from this site,{" "}
            <Link href="/contact" className="underline hover:text-brand-deep">
              let us know
            </Link>{" "}
            so it can be fixed.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
