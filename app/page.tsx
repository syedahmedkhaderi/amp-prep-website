import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/ui/SiteChrome";
import { getQuestionCount } from "@/lib/db/queries";

export default function HomePage() {
  const stats = getQuestionCount();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-white to-surface py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-brand-deep md:text-5xl">
              Master the UDST Math Placement Test
            </h1>
            <p className="mt-6 text-lg text-ink-soft">
              Practice with {stats.total > 0 ? `${stats.total}+ ` : ""}original
              questions across all 20 AMP 1 topics, each with a full worked
              solution. Take a timed mock exam that mirrors the real test
              interface, so nothing surprises you on exam day.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="rounded-lg bg-brand-deep px-8 py-3 font-medium text-white hover:bg-brand-700"
              >
                Start practicing free
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg border border-surface-border px-8 py-3 font-medium text-ink hover:border-brand-600"
              >
                See pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-light">
              Free forever. No credit card required. 20 practice questions per
              day and one timed mock per week.
            </p>
          </div>
        </section>

        {/* Format explanation */}
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

        {/* Topic list */}
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

        {/* How it works */}
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

        {/* CTA */}
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
