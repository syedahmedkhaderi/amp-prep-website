"use client";

import { useState } from "react";
import type { ClientSafeQuestion } from "@/lib/types";
import { MathText } from "@/components/ui/Katex";
import { gradeCheckpointAction } from "@/app/(app)/learn/[topicSlug]/[lessonSlug]/actions";

/**
 * A check-your-understanding question inside a lesson.
 *
 * The question arrives already stripped by toClientSafe, so this component has
 * no idea which option is correct until the student answers and the server
 * tells it. That is deliberate: the alternative — sending the answer key down
 * with the page and hiding it in the DOM — puts every lesson's answers one
 * "view source" away.
 */

interface Feedback {
  isCorrect: boolean;
  correctAnswer: string;
  explanationSteps: string[];
  conceptSummary: string | null;
}

export function Checkpoint({ question }: { question: ClientSafeQuestion }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNumeric = question.type === "numeric";
  const canSubmit = isNumeric ? typed.trim().length > 0 : selected !== null;

  async function submit() {
    if (!canSubmit || pending) return;
    setPending(true);
    setError(null);
    const response = isNumeric ? typed.trim() : selected;
    const result = await gradeCheckpointAction(question.id, response);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFeedback({
      isCorrect: result.isCorrect,
      correctAnswer: result.correctAnswer,
      explanationSteps: result.explanationSteps,
      conceptSummary: result.conceptSummary,
    });
  }

  return (
    <div className="rounded-lg border border-surface-border bg-white p-4">
      <div className="text-ink">
        <MathText text={question.stem} />
      </div>

      {isNumeric ? (
        <input
          type="text"
          inputMode="decimal"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={feedback !== null}
          placeholder="Your answer"
          aria-label="Your answer"
          className="mt-3 w-40 rounded-lg border border-surface-border px-3 py-2 text-ink focus:border-brand-600 focus:outline-none disabled:bg-surface-panel"
        />
      ) : (
        <ul className="mt-3 space-y-2">
          {(question.options ?? []).map((option) => {
            const chosen = selected === option.id;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  disabled={feedback !== null}
                  onClick={() => setSelected(option.id)}
                  aria-pressed={chosen}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    chosen ? "border-brand-deep bg-brand-600/5" : "border-surface-border hover:border-brand-600"
                  } disabled:cursor-default`}
                >
                  <MathText text={option.content} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {feedback === null ? (
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || pending}
          className="mt-3 rounded-lg bg-brand-deep px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? "Checking..." : "Check answer"}
        </button>
      ) : (
        <div className={`mt-4 rounded-lg p-3 ${feedback.isCorrect ? "bg-green-50" : "bg-amber-50"}`}>
          <p className={`text-sm font-semibold ${feedback.isCorrect ? "text-green-800" : "text-amber-800"}`}>
            {feedback.isCorrect ? "Correct" : "Not quite"}
          </p>
          {!feedback.isCorrect && (
            <p className="mt-1 text-sm text-ink">
              The answer is <MathText text={feedback.correctAnswer} />
            </p>
          )}
          {feedback.explanationSteps.length > 0 && (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
              {feedback.explanationSteps.map((step, i) => (
                <li key={i}>
                  <MathText text={step} />
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
