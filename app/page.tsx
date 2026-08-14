import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader, SiteFooter } from "@/components/ui/SiteChrome";
import { AccountDeletedNotice } from "@/components/ui/AccountDeletedNotice";
import { SampleQuestions } from "@/components/ui/SampleQuestions";
import {
  getQuestionCount,
  getQuestions,
  getTopicBySlug,
  getTopicQuestionStats,
  getTopics,
} from "@/lib/db/queries";
import { toClientSafe } from "@/lib/types";

/**
 * A few free, published single-answer questions to show on the marketing page.
 *
 * Picked at build time rather than per request so the page stays static, and
 * passed through toClientSafe so the answer key never reaches the browser. The
 * correct option index is sent separately and only drives the "Show answer"
 * toggle for these three questions.
 */
function getSampleQuestions() {
  // Spread across arithmetic, algebra and trigonometry so the range of the bank
  // is visible. Slugs are verified against data/generated/topics.json; a slug
  // that stops existing drops its sample rather than breaking the page.
  const wanted = ["fractions", "factoring", "trigonometry", "logarithms"];
  const samples: {
    question: ReturnType<typeof toClientSafe>;
    correctIndex: number;
    topic: string;
  }[] = [];

  for (const slug of wanted) {
    const topic = getTopicBySlug(slug);
    if (!topic) continue;

    const candidate = getQuestions({
      topicId: topic.id,
      isFree: true,
      type: "single_mcq",
      limit: 12,
    }).find((q) => {
      const correct = q.options?.findIndex((o) => o.isCorrect) ?? -1;
      // Keep it short enough to read at a glance on a marketing page.
      return correct >= 0 && q.stem.length < 180 && (q.options?.length ?? 0) === 4;
    });

    if (!candidate) continue;
    samples.push({
      question: toClientSafe(candidate),
      correctIndex: candidate.options!.findIndex((o) => o.isCorrect),
      topic: topic.name,
    });
  }

  return samples;
}

/**
 * Per-topic question counts, read from the bank at build time.
 *
 * The topic list used to be a hardcoded array of names, which drifts from what
 * is actually in the database and quietly becomes a claim rather than a fact.
 * Topics with nothing published in them are dropped: listing an empty topic is
 * the thing that makes a count look invented.
 */
function getTopicStats() {
  return getTopics()
    .map((topic) => ({
      slug: topic.slug,
      name: topic.name,
      total: getTopicQuestionStats(topic.id).total,
    }))
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total);
}

export default function HomePage() {
  const stats = getQuestionCount();
  const samples = getSampleQuestions();
  const topicStats = getTopicStats();
  const totalQuestions = topicStats.reduce((sum, t) => sum + t.total, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <Suspense fallback={null}>
        <AccountDeletedNotice />
      </Suspense>
      <main id="main-content" className="flex-1">
        <section className="border-b border-surface-border bg-gradient-to-b from-surface-panel to-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">
                UDST AMP practice
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-brand-deep md:text-5xl">
                Prepare for AMP 1 and AMP 2 with exam style practice
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">
                Work through original mathematics questions by topic, then sit a timed mock that uses the same page rail, saved answer counter, and quiz controls you will see on test day.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="rounded-lg bg-brand-deep px-8 py-3 text-center font-medium text-white shadow-sm transition hover:bg-brand-700 hover:shadow"
                >
                  Start practicing free
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-lg border border-surface-border bg-white px-8 py-3 text-center font-medium text-ink transition hover:border-brand-600"
                >
                  Compare plans
                </Link>
              </div>
              <p className="mt-4 text-sm text-ink-light">
                Free account: 20 practice questions each day and 1 AMP 1 mock each week.
              </p>
            </div>

            <div
              aria-hidden="true"
              className="overflow-hidden rounded-xl border border-surface-border bg-surface p-4 shadow-sm"
            >
              <div className="flex flex-col gap-2 border-b border-surface-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-brand-deep">AMP 1 Mock</p>
                  <p className="text-xs text-ink-light">Attempt preview</p>
                </div>
                <p className="font-mono text-sm font-bold text-brand-deep">Time Left: 1:18:42</p>
              </div>
              <div className="grid min-h-[360px] grid-cols-1 bg-white sm:grid-cols-[126px_1fr]">
                <div className="hidden border-r border-surface-border bg-surface-panel p-2 sm:block">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className={`mb-2 rounded px-2 py-2 text-xs ${n === 3 ? "bg-quiz-blue text-white" : "text-ink"}`}
                    >
                      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded border border-surface-border bg-white text-ink">
                        {n < 3 && (
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-green-600">
                            <path
                              fillRule="evenodd"
                              d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>
                      Page {n}
                    </div>
                  ))}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between border-b border-surface-border pb-3">
                    <button className="rounded border border-surface-border px-3 py-1.5 text-sm text-ink-soft">
                      Previous Page
                    </button>
                    <span className="text-sm text-ink-soft">Page 3 of 60</span>
                    <button className="rounded bg-quiz-blue px-3 py-1.5 text-sm font-medium text-white">
                      Next Page
                    </button>
                  </div>
                  <div className="mt-6">
                    <p className="font-bold text-ink">Question 3 (1 point)</p>
                    <p className="mt-3 leading-7 text-ink">
                      A student answered 42 questions correctly out of 60. What percent of the questions were correct?
                    </p>
                    <div className="mt-5 space-y-2 text-sm">
                      {["60%", "65%", "70%", "75%"].map((option, index) => (
                        <div
                          key={option}
                          className={`rounded-lg border px-4 py-3 ${index === 2 ? "border-quiz-blue bg-surface-panel" : "border-surface-border"}`}
                        >
                          <span className="mr-2 font-medium">{String.fromCharCode(65 + index)}.</span>
                          {option}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-8 border-t border-surface-border pt-4">
                    <button className="rounded bg-quiz-blue px-5 py-2 text-sm font-medium text-white">
                      Submit Quiz
                    </button>
                    <span className="ml-4 text-sm italic text-ink-soft">2 of 60 questions saved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-3xl font-bold text-brand">60</div>
              <p className="mt-1 text-sm text-ink-soft">
                Multiple choice questions on AMP 1, covering 20 topic areas from
                arithmetic to basic statistics.
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand">2 hours</div>
              <p className="mt-1 text-sm text-ink-soft">
                Time limit for the real AMP 1 exam. Our timed mock uses the same
                countdown so you build pacing under pressure.
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand">20 topics</div>
              <p className="mt-1 text-sm text-ink-soft">
                From fractions and percentages to coordinate geometry and
                trigonometry, each topic has dedicated practice.
              </p>
            </div>
          </div>
        </section>

        {samples.length > 0 && (
          <section className="border-y border-surface-border bg-white py-16">
            <div className="mx-auto max-w-3xl px-6">
              <h2 className="text-2xl font-bold text-brand-deep">
                See a real question
              </h2>
              <p className="mt-2 text-ink-soft">
                These are taken straight from the bank, typeset the same way you
                will see them in practice and in mock exams.
              </p>
              <div className="mt-8">
                <SampleQuestions samples={samples} />
              </div>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-bold text-brand-deep">How it works</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Practise a topic",
                body: "Pick any topic and work through questions one at a time. You get the answer and a full worked solution immediately, so a mistake becomes something you learn from rather than a number at the end.",
              },
              {
                title: "Sit a timed mock",
                body: "When topics feel solid, take a full mock under the real time limit, in an interface built to match the test. Pacing is what most people lose marks to, and it is only trainable under a clock.",
              },
              {
                title: "See what to fix",
                body: "Every attempt is scored and broken down by topic, so your next session starts with the weakest area instead of whatever you feel like revising.",
              },
            ].map((step, i) => (
              <li key={step.title}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-deep text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-surface-panel py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-2xl font-bold text-brand-deep">
              Every topic, with what is actually in it
            </h2>
            <p className="mt-2 text-ink-soft">
              Real counts from the question bank, not a promise. Each question
              comes with a step by step worked solution.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topicStats.map((t) => (
                <div
                  key={t.slug}
                  className="flex items-baseline justify-between gap-3 rounded-lg border border-surface-border bg-white px-4 py-3 transition hover:border-brand-600 hover:shadow-sm"
                >
                  <span className="text-sm text-ink">{t.name}</span>
                  <span className="shrink-0 text-xs font-medium text-ink-light">
                    {t.total.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-ink-light">
              {totalQuestions.toLocaleString()} questions across{" "}
              {topicStats.length} topics, and growing.
            </p>
          </div>
        </section>

        <section className="bg-brand-deep py-16">
          <div className="mx-auto max-w-3xl px-6 text-center text-white">
            <h2 className="text-3xl font-bold">
              Ready to start preparing?
            </h2>
            <p className="mt-4 text-white/80">
              Create a free account and practice your first questions in under
              two minutes.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-block rounded-lg bg-white px-8 py-3 font-medium text-brand-deep hover:bg-surface-panel"
            >
              Start
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
