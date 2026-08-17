"use client";

import { MathText } from "@/components/ui/Katex";
import { RichText } from "@/components/ui/RichText";

/**
 * A real reviewed question, shown on the marketing page.
 *
 * What separates this product from a pile of past papers is what happens after
 * a wrong answer: numbered working, the concept behind it, and a line on why
 * each wrong option was tempting. That is invisible from a feature list, so the
 * page shows an actual reviewed question instead of describing one.
 *
 * The data comes straight from the bank, so this cannot drift from what a
 * student really sees on the review page.
 */

export interface ShowcaseQuestion {
  stem: string;
  options: { content: string; isCorrect: boolean }[];
  explanationSteps: string[];
  conceptSummary: string;
  distractorRationales: Record<string, string>;
  topic: string;
}

export function WorkedSolutionShowcase({ question }: { question: ShowcaseQuestion }) {
  const { stem, options, explanationSteps, conceptSummary, distractorRationales } = question;

  // Rationales are keyed by option index in some rows and by option content in
  // others, a split inherited from two generations of the generator.
  const rationaleFor = (index: number, content: string) =>
    distractorRationales[String(index)] ?? distractorRationales[content] ?? null;

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
      <div className="border-b border-surface-border bg-surface-panel px-5 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Question review &middot; {question.topic}
        </p>
      </div>

      <div className="px-5 py-4">
        <div className="text-ink">
          <RichText text={stem} />
        </div>

        <div className="mt-4 space-y-1.5">
          {options.map((opt, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded px-3 py-2 text-sm ${
                opt.isCorrect ? "bg-green-100 text-green-800" : "text-ink-soft"
              }`}
            >
              <span className="font-medium">{String.fromCharCode(65 + i)}.</span>
              <MathText text={opt.content} />
              {opt.isCorrect && <span className="ml-auto text-xs font-medium">Correct answer</span>}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-surface-panel px-4 py-3">
          <p className="text-sm font-semibold text-ink">Worked solution</p>
          <ol className="mt-2 space-y-1.5">
            {explanationSteps.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink">
                <span className="shrink-0 font-medium tabular-nums">{i + 1}.</span>
                <span className="min-w-0">
                  <MathText text={step} />
                </span>
              </li>
            ))}
          </ol>

          {conceptSummary && (
            <p className="mt-3 text-sm text-ink">
              <span className="font-semibold">Concept: </span>
              <MathText text={conceptSummary} />
            </p>
          )}

          {options.some((o, i) => !o.isCorrect && rationaleFor(i, o.content)) && (
            <div className="mt-3">
              <p className="text-sm font-semibold text-ink">Why the wrong options are wrong</p>
              <ul className="mt-1.5 space-y-1">
                {options.map((opt, i) => {
                  if (opt.isCorrect) return null;
                  const why = rationaleFor(i, opt.content);
                  if (!why) return null;
                  return (
                    <li key={i} className="text-sm text-ink-soft">
                      <span className="text-ink">
                        <MathText text={opt.content} />
                      </span>
                      {": "}
                      <MathText text={why} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
