import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/app/auth/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-surface-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="font-bold text-brand-deep">
              AMP Prep
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/dashboard" className="text-ink-soft hover:text-brand-deep">
                Dashboard
              </Link>
              <Link href="/topics" className="text-ink-soft hover:text-brand-deep">
                Topics
              </Link>
              <Link href="/mock" className="text-ink-soft hover:text-brand-deep">
                Mock exams
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              user.plan === "pro"
                ? "bg-brand-deep text-white"
                : "bg-surface-panel text-ink-soft"
            }`}>
              {user.plan === "pro" ? "PRO" : "FREE"}
            </span>
            <Link href="/account" className="text-sm text-ink-soft hover:text-brand-deep">
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
      <main className="flex-1">{children}</main>
    </div>
  );
}
