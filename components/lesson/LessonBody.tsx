import type { LessonBlock } from "@/lib/types";
import type { AnyPlotSpec, DiagramSpec } from "@/lib/math/plot";
import { MathText } from "@/components/ui/Katex";
import { Plot } from "@/components/lesson/Plot";
import { Diagram } from "@/components/lesson/Diagram";
import { PlotWithSliders, type InteractivePlotSpec } from "@/components/lesson/PlotWithSliders";

/**
 * Renders a lesson body from its block list.
 *
 * Every string that can contain math goes through MathText, the same renderer
 * the question bank uses, so a lesson and the questions that follow it are
 * typeset identically.
 *
 * The checkpoint block is deliberately not rendered here — it needs the
 * question rows and a grading action, so the page passes a rendered element in
 * via `renderCheckpoint`. That keeps this component free of database access and
 * keeps the answer key out of it entirely.
 */

const CALLOUT_STYLE: Record<string, { wrapper: string; label: string }> = {
  tip: { wrapper: "border-brand-600/40 bg-brand-600/5", label: "Tip" },
  "watch-out": { wrapper: "border-amber-500/50 bg-amber-50", label: "Watch out" },
  "common-mistake": { wrapper: "border-red-400/50 bg-red-50", label: "Common mistake" },
};

export function LessonBody({
  blocks,
  renderCheckpoint,
}: {
  blocks: LessonBlock[];
  renderCheckpoint?: (questionIds: string[], prompt?: string) => React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "prose":
            return (
              <p key={i} className="text-ink leading-relaxed">
                <MathText text={block.text} />
              </p>
            );

          case "definition":
            return (
              <dl key={i} className="rounded-xl border border-surface-border bg-surface-panel p-4">
                <dt className="font-semibold text-brand-deep">
                  <MathText text={block.term} />
                </dt>
                <dd className="mt-1 text-ink-soft">
                  <MathText text={block.meaning} />
                </dd>
              </dl>
            );

          case "worked_example":
            return (
              <section key={i} className="rounded-xl border border-surface-border bg-white p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-light">Worked example</h3>
                <p className="mt-2 font-medium text-ink">
                  <MathText text={block.prompt} />
                </p>
                <ol className="mt-4 space-y-3">
                  {block.steps.map((step, j) => (
                    <li key={j} className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-deep text-xs font-semibold text-white">
                        {j + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-ink">
                          <MathText text={step.action} />
                        </div>
                        {step.math && (
                          <div className="mt-1 overflow-x-auto">
                            <MathText text={step.math} />
                          </div>
                        )}
                        {/* The reason the step is allowed. This is the part
                            that teaches; without it the example is a transcript. */}
                        <div className="mt-1 text-sm text-ink-soft">
                          <MathText text={step.why} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 border-t border-surface-border pt-3 font-semibold text-brand-deep">
                  Answer: <MathText text={block.answer} />
                </p>
              </section>
            );

          case "graph":
            return (
              <figure key={i} className="flex flex-col items-center">
                <Plot spec={block.spec as AnyPlotSpec} />
                {block.caption && (
                  <figcaption className="mt-2 text-sm text-ink-soft">
                    <MathText text={block.caption} />
                  </figcaption>
                )}
              </figure>
            );

          case "interactive":
            return (
              <figure key={i} className="flex flex-col items-center">
                <PlotWithSliders spec={block.spec as InteractivePlotSpec} />
                {block.caption && (
                  <figcaption className="mt-2 text-sm text-ink-soft">
                    <MathText text={block.caption} />
                  </figcaption>
                )}
              </figure>
            );

          case "diagram":
            return (
              <figure key={i} className="flex flex-col items-center">
                <Diagram spec={block.spec as DiagramSpec} />
                {block.caption && (
                  <figcaption className="mt-2 text-sm text-ink-soft">
                    <MathText text={block.caption} />
                  </figcaption>
                )}
              </figure>
            );

          case "callout": {
            const style = CALLOUT_STYLE[block.kind] ?? CALLOUT_STYLE.tip;
            return (
              <aside key={i} className={`rounded-xl border-l-4 p-4 ${style.wrapper}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-light">{style.label}</p>
                <p className="mt-1 text-ink">
                  <MathText text={block.text} />
                </p>
              </aside>
            );
          }

          case "checkpoint":
            return (
              <section key={i} className="rounded-xl border border-brand-600/30 bg-surface-panel p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-deep">Check your understanding</h3>
                {block.prompt && (
                  <p className="mt-1 text-sm text-ink-soft">
                    <MathText text={block.prompt} />
                  </p>
                )}
                <div className="mt-3">
                  {renderCheckpoint ? (
                    renderCheckpoint(block.questionIds, block.prompt)
                  ) : (
                    <p className="text-sm text-ink-light">Practice questions load on the lesson page.</p>
                  )}
                </div>
              </section>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
