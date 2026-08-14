"use client";

import { useState } from "react";
import { MathText } from "@/components/ui/Katex";
import type { ClientSafeQuestion } from "@/lib/types";

/**
 * Real questions from the bank, rendered on the marketing page.
 *
 * The typeset mathematics is the strongest evidence that this is a serious
 * study tool rather than a list of plain-text trivia, and until now it was
 * invisible to anyone who had not already signed up. Describing the questions
 * cannot do what showing one does.
 *
 * The questions come through toClientSafe like everywhere else, so the answer
 * key is not in the page. "Show answer" only reveals which option is correct,
 * from a separately supplied index, and no worked solution is included.
 */
export function SampleQuestions({
  samples,
}: {
  samples: { question: ClientSafeQuestion; correctIndex: number; topic: string }[];
}) {
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const current = samples[active];
  if (!current) return null;

  const isRevealed = revealed[active] ?? false;

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sample questions">
        {samples.map((s, i) => (
          <button
            key={s.question.id}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              i === active
                ? "bg-brand-deep text-white"
                : "border border-surface-border text-ink-soft hover:border-brand-600"
            }`}
          >
            {s.topic}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-surface-border bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-light">
          {current.question.difficulty} &middot; {current.topic}
        </p>

        <div className="mt-3 text-ink">
          <MathText text={current.question.stem} />
        </div>

        <ol className="mt-5 space-y-2">
          {current.question.options?.map((opt, i) => {
            const correct = isRevealed && i === current.correctIndex;
            return (
              <li
                key={opt.id}
                className={`flex items-start gap-3 rounded-lg border px-4 py-2.5 text-sm transition ${
                  correct
                    ? "border-green-400 bg-green-50"
                    : "border-surface-border bg-white"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    correct ? "bg-green-600 text-white" : "bg-surface-panel text-ink-soft"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-ink">
                  <MathText text={opt.content} />
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex items-center gap-4">
          <button
            onClick={() => setRevealed((r) => ({ ...r, [active]: !isRevealed }))}
            className="rounded-lg border border-surface-border px-4 py-2 text-sm text-ink-soft transition hover:border-brand-600 hover:text-brand-deep"
          >
            {isRevealed ? "Hide answer" : "Show answer"}
          </button>
          <p className="text-xs text-ink-light">
            Full worked solutions are shown after every practice question.
          </p>
        </div>
      </div>
    </div>
  );
}
