import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/app/auth/actions";
import { AppNav } from "@/components/ui/AppNav";
import { Logo } from "@/components/ui/Logo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-surface-border bg-white">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="rounded-md" aria-label="AMP Prep dashboard">
              <Logo size={32} />
            </Link>
            <AppNav />
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              user.plan === "pro"
                ? "bg-brand-deep text-white"
                : "bg-surface-panel text-ink-soft"
            }`}>
              {user.plan === "pro" ? "PRO" : "FREE"}
            </span>
            <Link
              href="/account"
              className="hidden max-w-[160px] truncate text-sm text-ink-soft transition-colors hover:text-brand-deep sm:inline-block"
            >
              {user.fullName || user.email}
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="text-sm text-ink-light hover:text-brand-deep">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main-content" className="flex-1">{children}</main>
    </div>
  );
}
