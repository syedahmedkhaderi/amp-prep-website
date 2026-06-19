"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MathText } from "@/components/ui/Katex";
import { AnswerArea } from "@/components/test-runner/AnswerArea";
import type { ClientSafeQuestion } from "@/lib/types";

interface MockRunnerProps {
  attemptId: string;
  questions: ClientSafeQuestion[];
  timeLimitSeconds: number | null;
  examTitle: string;
}

export function MockRunner({ attemptId, questions, timeLimitSeconds, examTitle }: MockRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    timeLimitSeconds || null
  );
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentQuestion = questions[currentIndex];
  const totalPages = questions.length;

  // Server authoritative timer
  useEffect(() => {
    if (!timeLimitSeconds) return;

    const fetchRemaining = async () => {
      try {
        const res = await fetch(`/api/attempts/${attemptId}/time`);
        const data = await res.json();
        if (data.remainingSeconds !== undefined) {
          setRemainingSeconds(data.remainingSeconds);
          if (data.remainingSeconds <= 0) {
            await submitAttempt(true);
          }
        }
      } catch {}
    };

    fetchRemaining();
    timerRef.current = setInterval(fetchRemaining, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [attemptId, timeLimitSeconds]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleAnswerChange = useCallback((response: any) => {
    const qid = currentQuestion.id;
    setAnswers((prev) => ({ ...prev, [qid]: response }));

    // Autosave
    fetch(`/api/attempts/${attemptId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: qid, response }),
    }).then(async (res) => {
      const data = await res.json();
      if (res.ok) {
        setSavedIds((prev) => new Set(prev).add(qid));
      }
    }).catch(() => {});
  }, [currentQuestion.id, attemptId]);

  const submitAttempt = async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed.");
      window.location.href = `/attempt/${attemptId}/review`;
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };
  const handleNext = () => {
    if (currentIndex < totalPages - 1) setCurrentIndex(currentIndex + 1);
  };

  const isWarning = remainingSeconds !== null && remainingSeconds <= 300 && remainingSeconds > 60;
  const isCritical = remainingSeconds !== null && remainingSeconds <= 60;

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header replacing lockdown browser bar */}
      <header className="flex items-center justify-between border-b border-surface-border bg-brand-deep px-6 py-3 text-white">
        <div className="flex items-center gap-6">
          <span className="font-bold">AMP Prep</span>
          <span className="text-sm text-white/80">{examTitle}</span>
        </div>
        {remainingSeconds !== null && (
          <div className={`font-mono text-sm font-bold ${
            isCritical ? "text-red-300 animate-pulse" : isWarning ? "text-yellow-300" : "text-white"
          }`}>
            Time Left: {formatTime(remainingSeconds)}
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left navigation rail */}
        <nav className="w-[140px] flex-shrink-0 border-r border-surface-border bg-surface-panel overflow-y-auto rail-scroll">
          <div className="p-2">
            {questions.map((q, i) => {
              const isSaved = savedIds.has(q.id);
              const isCurrent = i === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-full text-left p-2 rounded text-xs transition-colors ${
                    isCurrent ? "bg-quiz-blue text-white" : "text-ink hover:bg-surface-border"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`flex h-4 w-4 items-center justify-center rounded text-[10px] ${
                      isCurrent ? "bg-white/20" : isSaved ? "bg-green-200 text-green-800" : "bg-white border border-surface-border"
                    }`}>
                      {isSaved ? "✓" : ""}
                    </span>
                    <span>Page {i + 1}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content column */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-8 py-6">
            {/* Top control bar */}
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="rounded border border-surface-border px-4 py-1.5 text-sm text-ink-soft disabled:opacity-40"
              >
                Previous Page
              </button>
              <span className="text-sm text-ink-soft">
                Page {currentIndex + 1} of {totalPages}
              </span>
              <button
                onClick={handleNext}
                disabled={currentIndex === totalPages - 1}
                className="rounded bg-quiz-blue px-4 py-1.5 text-sm font-medium text-white hover:bg-quiz-dark"
              >
                Next Page
              </button>
            </div>

            {/* Question block */}
            <div className="mt-6">
              <h2 className="text-lg font-bold text-ink">
                Question {currentIndex + 1} ({currentQuestion.points} {currentQuestion.points === 1 ? "point" : "points"})
              </h2>
              <div className="mt-3 text-base leading-relaxed text-ink">
                <MathText text={currentQuestion.stem} />
              </div>

              <AnswerArea
                question={currentQuestion}
                initialResponse={answers[currentQuestion.id]}
                onAnswerChange={handleAnswerChange}
              />
            </div>

            {/* Bottom controls */}
            <div className="mt-8 flex items-center justify-between border-t border-surface-border pt-3">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="rounded border border-surface-border px-4 py-1.5 text-sm text-ink-soft disabled:opacity-40"
              >
                Previous Page
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === totalPages - 1}
                className="rounded bg-quiz-blue px-4 py-1.5 text-sm font-medium text-white hover:bg-quiz-dark"
              >
                Next Page
              </button>
            </div>

            {/* Divider */}
            <hr className="my-4 border-surface-border" />

            {/* Submit */}
            <div className="flex items-center gap-4">
              {!showSubmitConfirm ? (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={submitting}
                  className="rounded bg-quiz-blue px-6 py-2 text-sm font-medium text-white hover:bg-quiz-dark"
                >
                  Submit Quiz
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => submitAttempt(false)}
                    disabled={submitting}
                    className="rounded bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    {submitting ? "Submitting..." : "Confirm Submit"}
                  </button>
                  <button
                    onClick={() => setShowSubmitConfirm(false)}
                    className="rounded border border-surface-border px-4 py-2 text-sm text-ink-soft"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <span className="text-sm italic text-ink-soft">
                {savedIds.size} of {totalPages} questions saved
              </span>
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
