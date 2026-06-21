"use client";

import { useState, useCallback } from "react";
import { MathText } from "@/components/ui/Katex";
import { AnswerArea } from "@/components/test-runner/AnswerArea";
import type { ClientSafeQuestion } from "@/lib/types";

interface PracticeRunnerProps {
  attemptId: string;
  questions: ClientSafeQuestion[];
  topicName?: string;
}

interface FeedbackState {
  [questionId: string]: any;
}

export function PracticeRunner({ attemptId, questions, topicName }: PracticeRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [savedCount, setSavedCount] = useState(0);
  const [feedbacks, setFeedbacks] = useState<FeedbackState>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleAnswerChange = useCallback((response: any) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: response }));
  }, [currentQuestion]);

  const saveAnswer = async () => {
    if (!currentQuestion) return;
    const response = answers[currentQuestion.id];
    if (!response) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: currentQuestion.id, response }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save answer.");

      setSavedCount(data.saved);
      if (data.feedback) {
        setFeedbacks((prev) => ({ ...prev, [currentQuestion.id]: data.feedback }));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCompleted(true);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  if (!questions.length || !currentQuestion) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-brand-deep">No questions available</h2>
        <p className="mt-4 text-ink-soft">
          This practice set has no questions. Choose another topic or run the question pipeline again.
        </p>
        <a
          href="/topics"
          className="mt-8 inline-block rounded-lg bg-brand-deep px-6 py-3 font-medium text-white hover:bg-brand-700"
        >
          Back to topics
        </a>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-brand-deep">Practice set complete</h2>
        <p className="mt-4 text-ink-soft">
          You answered {savedCount} of {questions.length} questions.
        </p>
        <a
          href={`/attempt/${attemptId}/review`}
          className="mt-8 inline-block rounded-lg bg-brand-deep px-6 py-3 font-medium text-white hover:bg-brand-700"
        >
          Review your answers
        </a>
      </div>
    );
  }

  const currentFeedback = feedbacks[currentQuestion.id];
  const hasAnswered = !!answers[currentQuestion.id];
  const hasSaved = !!currentFeedback;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Progress bar */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink">
            {topicName ? `Practice: ${topicName}` : "Practice"}
          </h1>
          <p className="text-sm text-ink-soft">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-ink-soft">Saved</p>
          <p className="font-bold text-ink">{savedCount} / {questions.length}</p>
        </div>
      </div>

      {/* Progress dots */}
      <div className="mb-8 flex gap-1">
        {questions.map((q, i) => {
          const answered = !!feedbacks[q.id];
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i === currentIndex
                  ? "bg-brand-deep"
                  : answered
                  ? "bg-green-400"
                  : "bg-surface-border"
              }`}
              aria-label={`Go to question ${i + 1}`}
            />
          );
        })}
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-surface-border bg-white p-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-ink-light">
            Question {currentIndex + 1} ({currentQuestion.points} {currentQuestion.points === 1 ? "point" : "points"})
          </span>
          <span className="rounded-full bg-surface-panel px-3 py-1 text-xs font-medium text-ink-soft capitalize">
            {currentQuestion.difficulty}
          </span>
        </div>
        <div className="text-base text-ink leading-relaxed">
          <MathText text={currentQuestion.stem} />
        </div>

        <AnswerArea
          key={currentQuestion.id}
          question={currentQuestion}
          initialResponse={answers[currentQuestion.id]}
          onAnswerChange={handleAnswerChange}
          revealed={hasSaved}
          feedback={currentFeedback}
        />

        {/* Feedback */}
        {currentFeedback && (
          <div className={`mt-6 rounded-lg border p-4 ${
            currentFeedback.isCorrect
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}>
            <p className={`font-medium ${currentFeedback.isCorrect ? "text-green-700" : "text-red-700"}`}>
              {currentFeedback.isCorrect ? "Correct." : "Not correct."}
            </p>
            <p className="mt-1 text-sm text-ink">
              <span className="font-medium">Answer: </span>
              <MathText text={currentFeedback.finalAnswer || currentFeedback.correctAnswer} />
            </p>
            {currentFeedback.conceptSummary && (
              <p className="mt-2 text-sm text-ink-soft">
                <span className="font-medium">Concept: </span>
                {currentFeedback.conceptSummary}
              </p>
            )}
            {currentFeedback.explanationSteps?.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-ink">Worked solution:</p>
                <ol className="mt-2 space-y-1.5">
                  {currentFeedback.explanationSteps.map((step: string, i: number) => (
                    <li key={i} className="text-sm text-ink-soft">
                      <span className="font-medium text-ink">{i + 1}.</span>{" "}
                      <MathText text={step} />
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {currentFeedback.distractorRationales &&
              Object.entries(currentFeedback.distractorRationales).length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-ink">Why other options are wrong:</p>
                  <ul className="mt-1 space-y-1">
                    {Object.entries(currentFeedback.distractorRationales).map(([key, val]: [string, any]) => (
                      <li key={key} className="text-sm text-ink-soft">
                        <MathText text={key} />: <MathText text={val} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="rounded-lg border border-surface-border px-5 py-2.5 text-sm font-medium text-ink-soft disabled:opacity-40"
        >
          Previous
        </button>
        <div className="flex gap-3">
          <button
            onClick={saveAnswer}
            disabled={!hasAnswered || saving || hasSaved}
            className="rounded-lg border border-brand-deep px-5 py-2.5 text-sm font-medium text-brand-deep disabled:opacity-40"
          >
            {saving ? "Saving..." : hasSaved ? "Saved" : "Save answer"}
          </button>
          <button
            onClick={goNext}
            disabled={currentIndex === questions.length - 1}
            className="rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
