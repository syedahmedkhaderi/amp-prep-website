import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getTopics, getPublishedLessons, getLessonProgress } from "@/lib/db/queries";
import { getUserProgressStats } from "@/lib/attempts";
import { getEntitlements } from "@/lib/entitlements";
import { getExamByCode } from "@/lib/db/queries";
import { SemiCircleGauge } from "@/components/ui/SemiCircleGauge";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const entitlements = getEntitlements(user);
  const topics = getTopics();
  const amp1Topics = topics.filter((t) => t.examCode === "AMP1");
  const amp1Exam = getExamByCode("AMP1");
  const progress = getUserProgressStats(user.id);
  const topicsPercent = progress.totalTopics > 0 ? (progress.topicsStarted / progress.totalTopics) * 100 : 0;

  // Lessons come first on this page. A student arriving at the dashboard should
  // see that the site teaches the syllabus, not only that it can test them on it.
  const lessons = getPublishedLessons();
  const lessonProgress = getLessonProgress(user.id);
  const lessonsDone = new Set(
    lessonProgress.filter((p) => p.state === "completed").map((p) => p.lessonId)
  );
  const amp1Slugs = new Set(amp1Topics.map((t) => t.slug));
  const amp1Lessons = lessons.filter((l) => l.topicSlug && amp1Slugs.has(l.topicSlug));
  const amp1LessonsDone = amp1Lessons.filter((l) => lessonsDone.has(l.id)).length;
  const lessonsPercent =
    amp1Lessons.length > 0 ? Math.round((amp1LessonsDone / amp1Lessons.length) * 100) : 0;

  // Resume where they left off, or start at the top of the syllabus.
  const nextLesson = amp1Lessons.find((l) => !lessonsDone.has(l.id)) ?? amp1Lessons[0];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-deep">
            Welcome, {user.fullName || "Student"}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {entitlements.isPro
              ? "You have unlimited practice and mocks."
              : `You have ${entitlements.dailyPracticeLimit - entitlements.dailyPracticeUsed} practice questions today and ${entitlements.weeklyMockLimit - entitlements.weeklyMocksUsed} mock this week.`}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <SemiCircleGauge
            percent={topicsPercent}
            caption={`${progress.topicsStarted} of ${progress.totalTopics} topics started`}
          />
          {!entitlements.isPro && (
            <Link
              href="/pricing"
              className="rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Upgrade to Pro
            </Link>
          )}
        </div>
      </div>

      {/* Quick actions. Learn leads, because reading the topic is the step
          before practising it. */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Link
          href={nextLesson ? `/learn/${nextLesson.topicSlug}/${nextLesson.slug}` : "/learn"}
          className="rounded-xl border-2 border-brand-deep bg-white p-6 transition-colors hover:bg-surface-panel"
        >
          <h2 className="font-semibold text-ink">
            {amp1LessonsDone > 0 ? "Continue learning" : "Learn the topics"}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Every syllabus topic explained from scratch, in plain language, with worked examples and
            graphs. Read it first, then practise it.
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-panel">
            <div className="h-full rounded-full bg-brand-deep" style={{ width: `${lessonsPercent}%` }} />
          </div>
          <span className="mt-2 inline-block text-sm font-medium text-brand-600">
            {amp1LessonsDone} of {amp1Lessons.length} lessons read
          </span>
        </Link>
        <Link
          href="/topics"
          className="rounded-xl border border-surface-border bg-white p-6 hover:border-brand-600 transition-colors"
        >
          <h2 className="font-semibold text-ink">Start practice</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Choose a topic and answer questions with immediate feedback and full solutions.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-brand-600">
            Browse {amp1Topics.length} AMP 1 topics
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
            {entitlements.canTakeMock ? "Start mock exam" : "Weekly limit reached"}
          </span>
        </Link>
      </div>

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
