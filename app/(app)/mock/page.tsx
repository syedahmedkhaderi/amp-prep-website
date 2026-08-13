import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getExamByCode, getPapers } from "@/lib/db/queries";
import { getEntitlements } from "@/lib/entitlements";
import { getUserMockAttemptsByPaper } from "@/lib/attempts";
import type { Paper } from "@/lib/types";

export default async function MockPage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = searchParams ? await searchParams : {};

  const entitlements = getEntitlements(user);
  const amp1 = getExamByCode("AMP1");
  const amp2 = getExamByCode("AMP2");
  const amp1Papers = getPapers("AMP1");
  const amp2Papers = getPapers("AMP2");
  const attemptsByPaper = getUserMockAttemptsByPaper(user.id);

  const amp1Free = amp1Papers.filter((p) => p.isFree);
  const amp1Pro = amp1Papers.filter((p) => !p.isFree);
  const visibleAmp1 = entitlements.isPro ? amp1Papers : amp1Free;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-bold text-brand-deep">Timed mock exams</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Each mock reproduces the official quiz interface: a live countdown that
        auto submits at zero, and progress that autosaves. Pick any numbered
        exam below, and come back to review your score whenever you like.
      </p>
      {params.reason === "no-questions" && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          That mock exam isn't available. Choose another one below.
        </div>
      )}
      {params.reason === "weekly-limit" && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          You've used your free mock exam for the week.{" "}
          <Link href="/pricing" className="font-medium text-brand-600">Upgrade to Pro</Link> for unlimited mocks.
        </div>
      )}

      {/* AMP 1 */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold text-ink">AMP 1 mock exams</h2>
          <p className="text-xs text-ink-light">
            {amp1?.totalQuestions} questions · {amp1?.durationMinutes} minutes each
          </p>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {entitlements.isPro
            ? `${amp1Papers.length} mock exams available.`
            : `${amp1Free.length} mock exams on your plan · ${amp1Pro.length} more with Pro.`}
        </p>
        {!entitlements.isPro && (
          <p className="mt-1 text-xs text-ink-light">
            Free users get 1 mock per week, any exam number.{" "}
            <Link href="/pricing" className="text-brand-600">Upgrade to Pro</Link> for unlimited.
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleAmp1.map((paper) => (
            <MockPaperCard
              key={paper.id}
              paper={paper}
              canStart={entitlements.canTakeMock}
              attempt={attemptsByPaper[paper.id]}
            />
          ))}
          {!entitlements.isPro && amp1Pro.length > 0 && (
            <Link
              href="/pricing"
              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface-panel p-4 text-center text-sm text-ink-soft hover:border-brand-600 hover:text-brand-deep"
            >
              <span className="font-medium">+{amp1Pro.length} more</span>
              <span className="text-xs">with Pro</span>
            </Link>
          )}
        </div>
      </section>

      {/* AMP 2 */}
      <section className="mt-10">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-ink">AMP 2 mock exams</h2>
          {!entitlements.isPro && (
            <span className="rounded-full bg-brand-deep px-2 py-0.5 text-xs text-white">PRO</span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {amp2?.totalQuestions} questions · {amp2?.durationMinutes} minutes each ·{" "}
          {entitlements.isPro ? `${amp2Papers.length} mock exams available.` : `${amp2Papers.length} mock exams with Pro.`}
        </p>

        {entitlements.isPro ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {amp2Papers.map((paper) => (
              <MockPaperCard
                key={paper.id}
                paper={paper}
                canStart={entitlements.canTakeMock}
                attempt={attemptsByPaper[paper.id]}
              />
            ))}
          </div>
        ) : (
          <Link
            href="/pricing"
            className="mt-4 flex items-center justify-between rounded-xl border border-surface-border bg-white p-6 hover:border-brand-600"
          >
            <span className="text-sm text-ink-soft">
              Unlock {amp2Papers.length} AMP 2 mock exams covering precalculus topics.
            </span>
            <span className="rounded-lg border border-brand-deep px-4 py-2 text-sm font-medium text-brand-deep">
              Upgrade
            </span>
          </Link>
        )}
      </section>
    </div>
  );
}

function MockPaperCard({
  paper,
  canStart,
  attempt,
}: {
  paper: Paper;
  canStart: boolean;
  attempt?: { attemptId: string; score: number | null; submittedAt: string | null };
}) {
  const isSubmitted = attempt && attempt.submittedAt;
  const isInProgress = attempt && !attempt.submittedAt;

  return (
    <div className="rounded-lg border border-surface-border bg-white p-4">
      <p className="text-sm font-medium text-ink">{paper.name.replace(/^AMP \d /, "")}</p>
      {isSubmitted ? (
        <>
          <p className="mt-1 text-xl font-bold text-brand-deep">{attempt!.score}%</p>
          <div className="mt-2 flex gap-3 text-xs">
            <Link href={`/attempt/${attempt!.attemptId}/review`} className="text-brand-600 hover:text-brand-deep">
              Review
            </Link>
            {canStart && (
              <Link href={`/mock/start/${paper.examCode}?paper=${paper.id}`} className="text-ink-soft hover:text-brand-deep">
                Retake
              </Link>
            )}
          </div>
        </>
      ) : isInProgress ? (
        <Link
          href={`/mock/runner/${attempt!.attemptId}`}
          className="mt-2 inline-block text-sm font-medium text-brand-600 hover:text-brand-deep"
        >
          Resume
        </Link>
      ) : canStart ? (
        <Link
          href={`/mock/start/${paper.examCode}?paper=${paper.id}`}
          className="mt-2 inline-block text-sm font-medium text-brand-600 hover:text-brand-deep"
        >
          Start
        </Link>
      ) : (
        <p className="mt-2 text-xs text-ink-light">Weekly limit reached</p>
      )}
    </div>
  );
}
