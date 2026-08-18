import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getTopics, getQuestionCount } from "@/lib/db/queries";

export default async function TopicsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const isPro = user.plan === "pro";

  const topics = getTopics();
  const amp1 = topics.filter((t) => t.examCode === "AMP1");
  const amp2 = topics.filter((t) => t.examCode === "AMP2");

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-brand-deep">Topics</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Choose a topic to practice. Every question includes a full worked solution.
      </p>

      {/* AMP 1 */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink">AMP 1: Basic Mathematics</h2>
        <p className="text-sm text-ink-soft">20 topic areas covering high school math fundamentals.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {amp1.map((topic, i) => (
            <Link
              key={topic.id}
              href={`/topics/${topic.slug}`}
              className="group rounded-xl border border-surface-border bg-white p-4 hover:border-brand-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-ink-light">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-1 font-semibold text-ink group-hover:text-brand-deep">
                {topic.name}
              </h3>
              <p className="mt-1 text-xs text-ink-soft line-clamp-2">
                {topic.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* AMP 2 */}
      <section className="mt-12">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-ink">AMP 2: Precalculus</h2>
          {!isPro && (
            <span className="rounded-full bg-brand-deep px-2.5 py-0.5 text-xs font-medium text-white">
              PRO
            </span>
          )}
        </div>
        <p className="text-sm text-ink-soft">
          {isPro
            ? "Advanced topics for AMP 2 preparation."
            : "Upgrade to Pro to access AMP 2 content."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {amp2.map((topic, i) => (
            <Link
              key={topic.id}
              href={isPro ? `/topics/${topic.slug}` : "/pricing"}
              className={`group rounded-xl border border-surface-border bg-white p-4 transition-colors ${
                isPro ? "hover:border-brand-600" : "opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-ink-light">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {!isPro && <span className="text-xs text-brand-deep">Locked</span>}
              </div>
              <h3 className="mt-1 font-semibold text-ink">
                {topic.name}
              </h3>
              <p className="mt-1 text-xs text-ink-soft line-clamp-2">
                {topic.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
