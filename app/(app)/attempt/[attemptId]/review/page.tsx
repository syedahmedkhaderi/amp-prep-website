import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAttemptReview } from "@/lib/attempts";
import { MathText } from "@/components/ui/Katex";

export default async function AttemptReviewPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const { attempt, questions, answers } = getAttemptReview(attemptId);
  if (attempt.user_id !== user.id) redirect("/dashboard");

  const isSubmitted = !!attempt.submitted_at;
  const score = attempt.score;

  // Per-topic breakdown
  const topicBreakdown: Record<string, { correct: number; total: number }> = {};
  for (const q of questions) {
    const tName = q.topicName || "Unknown";
    if (!topicBreakdown[tName]) topicBreakdown[tName] = { correct: 0, total: 0 };
    topicBreakdown[tName].total++;
    const ans = answers.get(q.id);
    if (ans?.isCorrect) topicBreakdown[tName].correct++;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/dashboard" className="text-sm text-brand-600 hover:text-brand-deep">
        Back to dashboard
      </Link>

      {/* Score summary */}
      <div className="mt-4 rounded-2xl border border-surface-border bg-white p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-deep">
              {isSubmitted ? "Exam results" : "Attempt review"}
            </h1>
            <p className="mt-1 text-sm text-ink-soft capitalize">
              {attempt.mode} exam |{" "}
              {attempt.started_at && new Date(attempt.started_at + "Z").toLocaleString()}
            </p>
          </div>
          {isSubmitted && score !== null && (
            <div className="text-right">
              <div className={`text-4xl font-bold ${score >= 60 ? "text-green-600" : "text-brand-deep"}`}>
                {score}%
              </div>
              <p className="text-xs text-ink-light">
                {score >= 60 ? "Passing standard" : "Below passing standard"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Per-topic breakdown */}
      {isSubmitted && Object.keys(topicBreakdown).length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-ink">Topic breakdown</h2>
          <div className="mt-3 space-y-2">
            {Object.entries(topicBreakdown).map(([topic, data]) => (
              <div
                key={topic}
                className="flex items-center justify-between rounded-lg border border-surface-border bg-white px-4 py-2"
              >
                <span className="text-sm text-ink">{topic}</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-surface-panel">
                    <div
                      className={`h-full ${data.correct / data.total >= 0.6 ? "bg-green-500" : "bg-red-400"}`}
                      style={{ width: `${(data.correct / data.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-ink">
                    {data.correct}/{data.total}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question-by-question review */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-ink">Question review</h2>
        <div className="mt-4 space-y-6">
          {questions.map((q: any, i: number) => {
            const ans = answers.get(q.id);
            return (
              <div
                key={q.id}
                className={`rounded-xl border p-6 ${
                  !isSubmitted
                    ? "border-surface-border bg-white"
                    : ans?.isCorrect
                    ? "border-green-200 bg-green-50/30"
                    : "border-red-200 bg-red-50/30"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-ink-light">
                    Question {i + 1} ({q.points} {q.points === 1 ? "point" : "points"})
                  </span>
                  {isSubmitted && ans && (
                    <span className={`text-xs font-medium ${
                      ans.isCorrect ? "text-green-700" : "text-red-700"
                    }`}>
                      {ans.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  )}
                </div>

                <div className="mt-2 text-ink">
                  <MathText text={q.stem} />
                </div>

                {/* Options review */}
                {q.options && (
                  <div className="mt-3 space-y-1.5">
                    {q.options.map((opt: any, j: number) => (
                      <div
                        key={opt.id}
                        className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm ${
                          opt.isCorrect
                            ? "bg-green-100 text-green-800"
                            : ans?.response?.optionId === opt.id || ans?.response?.optionIds?.includes(opt.id)
                            ? "bg-red-100 text-red-800"
                            : "text-ink-soft"
                        }`}
                      >
                        <span className="font-medium">{String.fromCharCode(65 + j)}.</span>
                        <MathText text={opt.content} />
                        {opt.isCorrect && <span className="ml-auto text-xs">Correct answer</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Matching review */}
                {q.matches && q.matches.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {q.matches.map((m: any) => {
                      const userChoice = ans?.response?.answers?.[m.id];
                      const isRowCorrect = userChoice === m.correctChoiceIndex;
                      return (
                        <div
                          key={m.id}
                          className={`flex items-center justify-between gap-3 rounded px-3 py-1.5 text-sm ${
                            isSubmitted
                              ? isRowCorrect
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                              : "text-ink-soft"
                          }`}
                        >
                          <span><MathText text={m.leftContent} /></span>
                          <span className="whitespace-nowrap text-xs">
                            {userChoice !== undefined ? `Your answer: ${userChoice + 1}` : "No answer"}
                            {isSubmitted && !isRowCorrect && ` · Correct: ${m.correctChoiceIndex + 1}`}
                          </span>
                        </div>
                      );
                    })}
                    {q.matchChoices && q.matchChoices.length > 0 && (
                      <div className="mt-2 space-y-1 border-t border-surface-border pt-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Choices</p>
                        {q.matchChoices.map((choice: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-ink-soft">
                            <span className="min-w-[1.25rem] font-medium text-ink">{idx + 1}.</span>
                            <MathText text={choice} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Numeric review */}
                {q.type === "numeric" && (
                  <div className="mt-3 rounded bg-surface-panel px-3 py-2 text-sm">
                    <p className="text-ink-soft">
                      Your answer: <span className="font-medium text-ink">{ans?.response?.value ?? "No answer"}</span>
                    </p>
                    {isSubmitted && (
                      <p className="mt-1 text-ink-soft">
                        Correct answer: <span className="font-medium text-ink"><MathText text={q.finalAnswer} /></span>
                      </p>
                    )}
                  </div>
                )}

                {/* Explanation */}
                {isSubmitted && q.explanationSteps && q.explanationSteps.length > 0 && (
                  <div className="mt-4 rounded-lg bg-white p-4">
                    <p className="text-sm font-medium text-ink">Worked solution:</p>
                    <ol className="mt-2 space-y-1.5">
                      {q.explanationSteps.map((step: string, si: number) => (
                        <li key={si} className="text-sm text-ink-soft">
                          <span className="font-medium text-ink">{si + 1}.</span>{" "}
                          <MathText text={step} />
                        </li>
                      ))}
                    </ol>
                    {q.conceptSummary && (
                      <p className="mt-3 text-sm text-ink">
                        <span className="font-medium">Concept: </span>
                        <MathText text={q.conceptSummary} />
                      </p>
                    )}
                    {q.distractorRationales && Object.keys(q.distractorRationales).length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-ink">Why wrong options are wrong:</p>
                        <ul className="mt-1 space-y-1">
                          {Object.entries(q.distractorRationales).map(([key, val]: [string, any]) => (
                            <li key={key} className="text-sm text-ink-soft">
                              <MathText text={key} />: <MathText text={val} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <Link
          href="/dashboard"
          className="rounded-lg bg-brand-deep px-6 py-3 font-medium text-white hover:bg-brand-700"
        >
          Back to dashboard
        </Link>
        <Link
          href="/topics"
          className="rounded-lg border border-surface-border px-6 py-3 font-medium text-ink hover:border-brand-600"
        >
          Practice more
        </Link>
      </div>
    </div>
  );
}
