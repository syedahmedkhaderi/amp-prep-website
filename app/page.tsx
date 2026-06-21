import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/ui/SiteChrome";
import { getQuestionCount } from "@/lib/db/queries";

export default function HomePage() {
  const stats = getQuestionCount();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-surface-border bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
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
                  className="rounded-lg bg-brand-deep px-8 py-3 text-center font-medium text-white hover:bg-brand-700"
                >
                  Start practicing free
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-lg border border-surface-border px-8 py-3 text-center font-medium text-ink hover:border-brand-600"
                >
                  Compare plans
                </Link>
              </div>
              <p className="mt-4 text-sm text-ink-light">
                Free account: 20 practice questions each day and 1 AMP 1 mock each week.
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border border-surface-border bg-surface p-4 shadow-sm">
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
                      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded border border-surface-border bg-white text-[10px] text-ink">
                        {n < 3 ? "✓" : ""}
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

        <section className="bg-surface-panel py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-2xl font-bold text-brand-deep">
              Every topic on the AMP 1 syllabus
            </h2>
            <p className="mt-2 text-ink-soft">
              Practice any topic independently. Each question comes with a step
              by step worked solution.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {TOPIC_LIST.map((t, i) => (
                <div
                  key={t}
                  className="rounded-lg border border-surface-border bg-white px-4 py-3 text-sm text-ink"
                >
                  <span className="mr-2 text-ink-light">{i + 1}.</span>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-bold text-brand-deep">
            How it works
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-deep text-white font-bold">
                1
              </div>
              <h3 className="mt-4 font-semibold text-ink">Practice daily</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Answer original questions on any topic. Get immediate feedback
                with a full worked solution after each answer.
              </p>
            </div>
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-deep text-white font-bold">
                2
              </div>
              <h3 className="mt-4 font-semibold text-ink">Take a timed mock</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Sit a full 60 question, 120 minute mock that reproduces the
                official quiz layout. Autosave keeps your progress safe if you
                refresh.
              </p>
            </div>
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-deep text-white font-bold">
                3
              </div>
              <h3 className="mt-4 font-semibold text-ink">Review and improve</h3>
              <p className="mt-1 text-sm text-ink-soft">
                After each attempt, see your score, a per topic breakdown, and
                the correct answer with explanation for every question.
              </p>
            </div>
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
              Start free
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

const TOPIC_LIST = [
  "Real Number System",
  "Fractions",
  "Decimals",
  "Percent",
  "Ratios and Proportions",
  "Exponents",
  "Radicals",
  "Scientific Notation",
  "Algebraic Expressions",
  "Linear Equations",
  "Linear Inequalities",
  "Systems of Equations",
  "Polynomials",
  "Factoring",
  "Rational Expressions",
  "Coordinate Geometry",
  "Functions",
  "Measurement Geometry",
  "Right Triangle Trigonometry",
  "Statistics and Probability",
];
