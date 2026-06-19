import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getTopics } from "@/lib/db/queries";
import { getUserAttempts } from "@/lib/attempts";
import { getEntitlements } from "@/lib/entitlements";
import { getExamByCode } from "@/lib/db/queries";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const entitlements = getEntitlements(user);
  const topics = getTopics();
  const amp1Topics = topics.filter((t) => t.examCode === "AMP1");
  const recentAttempts = getUserAttempts(user.id, 5);
  const amp1Exam = getExamByCode("AMP1");

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-deep">
            Welcome, {user.fullName || "Student"}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {entitlements.isPro
              ? "You have unlimited practice and mocks."
              : `You have ${entitlements.dailyPracticeLimit - entitlements.dailyPracticeUsed} practice questions and ${entitlements.weeklyMockLimit - entitlements.weeklyMocksUsed} mock remaining today.`}
          </p>
        </div>
        {!entitlements.isPro && (
          <Link
            href="/pricing"
            className="rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Upgrade to Pro
          </Link>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          href="/topics"
          className="rounded-xl border border-surface-border bg-white p-6 hover:border-brand-600 transition-colors"
        >
          <h2 className="font-semibold text-ink">Start practice</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Choose a topic and answer questions with immediate feedback and full solutions.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-brand-600">
            Browse {amp1Topics.length} AMP 1 topics →
          </span>
        </Link>
        <Link
          href="/mock"
          className="rounded-xl border border-surface-border bg-white p-6 hover:border-brand-600 transition-colors"
        >
          <h2 className="font-semibold text-ink">Take a timed mock</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {amp1Exam ? `${amp1Exam.totalQuestions} questions, ${amp1Exam.durationMinutes} minutes. ` : ""}
            Mirrors the real test interface with a live countdown.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-brand-600">
            {entitlements.canTakeMock ? "Start mock exam →" : "Weekly limit reached"}
          </span>
        </Link>
      </div>

      {/* Recent attempts */}
      {recentAttempts.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-ink">Recent activity</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-surface-border bg-white">
            {recentAttempts.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between border-b border-surface-border px-6 py-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-ink capitalize">
                    {att.mode} {att.submittedAt ? "" : "(in progress)"}
                  </p>
                  <p className="text-xs text-ink-light">
                    {new Date(att.startedAt + "Z").toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  {att.score !== null ? (
                    <span className="text-lg font-bold text-brand-deep">{att.score}%</span>
                  ) : (
                    <Link
                      href={att.mode === "mock" ? `/mock/runner/${att.id}` : `/practice/runner/${att.id}`}
                      className="text-sm text-brand-600"
                    >
                      Resume
                    </Link>
                  )}
                  {att.score !== null && (
                    <div>
                      <Link
                        href={`/attempt/${att.id}/review`}
                        className="text-xs text-brand-600"
                      >
                        Review
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entitlements summary for free users */}
      {!entitlements.isPro && (
        <div className="mt-10 rounded-xl border border-surface-border bg-surface-panel p-6">
          <h2 className="font-semibold text-ink">Your free tier usage</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-ink-soft">Practice today</p>
              <p className="text-lg font-bold text-ink">
                {entitlements.dailyPracticeUsed} / {entitlements.dailyPracticeLimit}
              </p>
            </div>
            <div>
              <p className="text-ink-soft">Mocks this week</p>
              <p className="text-lg font-bold text-ink">
                {entitlements.weeklyMocksUsed} / {entitlements.weeklyMockLimit}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
