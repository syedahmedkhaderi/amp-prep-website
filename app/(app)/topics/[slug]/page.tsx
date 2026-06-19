import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTopicBySlug, getQuestions } from "@/lib/db/queries";

export default async function TopicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const topic = getTopicBySlug(slug);
  if (!topic) notFound();

  // Check AMP 2 access
  if (topic.examCode === "AMP2" && user.plan !== "pro") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-brand-deep">{topic.name}</h1>
        <p className="mt-4 text-ink-soft">
          This topic is part of AMP 2, which requires a Pro subscription.
        </p>
        <Link
          href="/pricing"
          className="mt-6 inline-block rounded-lg bg-brand-deep px-6 py-3 font-medium text-white hover:bg-brand-700"
        >
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  const questions = getQuestions({ topicId: topic.id, limit: 1000 });

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/topics" className="text-sm text-brand-600 hover:text-brand-deep">
        ← All topics
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-brand-deep">{topic.name}</h1>
      <p className="mt-2 text-ink-soft">{topic.description}</p>

      {questions.length === 0 ? (
        <div className="mt-8 rounded-xl border border-surface-border bg-surface-panel p-8 text-center">
          <p className="text-ink-soft">
            Questions for this topic are being generated. Please check back soon.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-surface-border bg-white p-4">
              <p className="text-2xl font-bold text-brand-deep">{questions.length}</p>
              <p className="text-xs text-ink-soft">Questions available</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-white p-4">
              <p className="text-2xl font-bold text-brand-deep">
                {questions.filter((q) => q.difficulty === "easy").length}
              </p>
              <p className="text-xs text-ink-soft">Easy questions</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-white p-4">
              <p className="text-2xl font-bold text-brand-deep">
                {questions.filter((q) => q.difficulty === "hard").length}
              </p>
              <p className="text-xs text-ink-soft">Hard questions</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/practice/start/${topic.slug}`}
              className="rounded-lg bg-brand-deep px-6 py-3 font-medium text-white hover:bg-brand-700"
            >
              Practice this topic
            </Link>
          </div>

          {/* Sample question preview */}
          {questions.length > 0 && (
            <div className="mt-10">
              <h2 className="text-lg font-bold text-ink">Sample question</h2>
              <div className="mt-4 rounded-xl border border-surface-border bg-white p-6">
                <p className="text-sm text-ink-soft capitalize">
                  {questions[0].difficulty} | {questions[0].type.replace(/_/g, " ")}
                </p>
                <p className="mt-2 text-ink">{questions[0].stem}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
