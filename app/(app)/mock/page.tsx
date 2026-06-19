import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getExamByCode, getQuestionCount } from "@/lib/db/queries";
import { getEntitlements } from "@/lib/entitlements";

export default async function MockPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const entitlements = getEntitlements(user);
  const amp1 = getExamByCode("AMP1");
  const amp2 = getExamByCode("AMP2");
  const counts = getQuestionCount();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold text-brand-deep">Timed mock exams</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Sit a full length mock that reproduces the official quiz interface. The
        timer counts down and auto submits at zero. Your progress autosaves.
      </p>

      {/* AMP 1 mock */}
      <div className="mt-8 rounded-xl border border-surface-border bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-ink">AMP 1 Mock Exam</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {amp1?.totalQuestions} questions, {amp1?.durationMinutes} minutes.
              Covers all 20 topics.
            </p>
            <p className="mt-1 text-xs text-ink-light">
              {counts.amp1} questions available in the bank.
            </p>
          </div>
          {entitlements.canTakeMock ? (
            <Link
              href="/mock/start/AMP1"
              className="rounded-lg bg-quiz-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-quiz-dark"
            >
              Start mock
            </Link>
          ) : (
            <span className="text-sm text-ink-light">
              Weekly limit reached
            </span>
          )}
        </div>
        {!entitlements.isPro && (
          <p className="mt-3 text-xs text-ink-light">
            Free users get 1 mock per week.{" "}
            <Link href="/pricing" className="text-brand-600">Upgrade to Pro</Link> for unlimited.
          </p>
        )}
      </div>

      {/* AMP 2 mock */}
      <div className="mt-4 rounded-xl border border-surface-border bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-ink">AMP 2 Mock Exam</h2>
              {!entitlements.isPro && (
                <span className="rounded-full bg-brand-deep px-2 py-0.5 text-xs text-white">PRO</span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              {amp2?.totalQuestions} questions, {amp2?.durationMinutes} minutes.
              Precalculus topics.
            </p>
            <p className="mt-1 text-xs text-ink-light">
              {counts.amp2} questions available in the bank.
            </p>
          </div>
          {entitlements.isPro ? (
            <Link
              href="/mock/start/AMP2"
              className="rounded-lg bg-quiz-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-quiz-dark"
            >
              Start mock
            </Link>
          ) : (
            <Link
              href="/pricing"
              className="rounded-lg border border-brand-deep px-5 py-2.5 text-sm font-medium text-brand-deep"
            >
              Upgrade
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
