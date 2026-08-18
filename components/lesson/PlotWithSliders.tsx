"use client";

import { useMemo, useState, useId } from "react";
import { renderPlot, type PlotSpec, type CurveSpec } from "@/lib/math/plot";
import { MathText } from "@/components/ui/Katex";

/**
 * A plot whose parameters the reader can drag.
 *
 * Most figures in these lessons are static, and deliberately so: a picture that
 * moves when it has nothing to show is a distraction. This exists for the
 * handful of ideas where the movement IS the idea. Seeing the parabola slide
 * sideways as $h$ changes explains vertex form faster than any paragraph, and
 * the same is true of amplitude and period on a sinusoid.
 *
 * The curve is re-evaluated with the same parser and the same geometry code as
 * the static Plot, so a slider cannot make the graph disagree with the lesson
 * around it.
 */

export interface SliderSpec {
  /** Parameter name used in the expression, e.g. "a". */
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  initial: number;
}

export interface InteractivePlotSpec {
  kind: "interactive";
  /** Expression in x plus the slider parameters, e.g. "a*(x-h)^2+k". */
  fn: string;
  sliders: SliderSpec[];
  viewport?: PlotSpec["viewport"];
  /** Shown above the graph with the live values substituted in. */
  equationTemplate?: string;
  description: string;
  /** Drawn faintly behind, so the reader can see what has changed. */
  reference?: string;
}

/** See the note in Plot.tsx: renderPlot returns data coordinates, not SVG ones. */
function polylinePath(
  points: { x: number; y: number }[],
  toSvg: (x: number, y: number) => { x: number; y: number }
): string {
  return points
    .map((p, i) => {
      const s = toSvg(p.x, p.y);
      return `${i === 0 ? "M" : "L"} ${s.x.toFixed(2)} ${s.y.toFixed(2)}`;
    })
    .join(" ");
}

export function PlotWithSliders({ spec }: { spec: InteractivePlotSpec }) {
  const groupId = useId();
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(spec.sliders.map((s) => [s.name, s.initial]))
  );

  const geometry = useMemo(() => {
    const curves: CurveSpec[] = [];
    if (spec.reference) {
      curves.push({ fn: spec.reference, color: "muted", dashed: true });
    }
    curves.push({ fn: spec.fn, params: values, color: "primary" });
    return renderPlot({
      kind: "cartesian",
      description: spec.description,
      viewport: spec.viewport,
      curves,
    });
  }, [spec.fn, spec.reference, spec.viewport, spec.description, values]);

  // Substitute the live values into the display equation so the reader can see
  // the numbers and the shape change together.
  const equation = useMemo(() => {
    if (!spec.equationTemplate) return null;
    let text = spec.equationTemplate;
    for (const [name, value] of Object.entries(values)) {
      const shown = Number.isInteger(value) ? String(value) : value.toFixed(1);
      text = text.replaceAll(`{${name}}`, shown);
    }
    return text;
  }, [spec.equationTemplate, values]);

  return (
    <figure className="w-full max-w-lg rounded-xl border border-surface-border bg-white p-4">
      {equation && (
        <div className="mb-2 text-center text-ink">
          <MathText text={equation} />
        </div>
      )}

      <svg
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        className="w-full h-auto"
        role="img"
        aria-label={spec.description}
      >
        <title>{spec.description}</title>

        {geometry.gridLines.map((line, i) => (
          <line
            key={`g-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            className="stroke-surface-border"
            strokeWidth={line.major ? 0 : 1}
          />
        ))}
        {geometry.axes.map((axis, i) => (
          <line key={`a-${i}`} {...axis} className="stroke-ink-light" strokeWidth={1.5} />
        ))}
        {geometry.ticks.map((t, i) =>
          t.label === "0" ? null : (
            <text
              key={`t-${i}`}
              x={t.axis === "x" ? t.x : t.x - 6}
              y={t.axis === "x" ? t.y + 14 : t.y + 4}
              className="fill-ink-light"
              fontSize={10}
              textAnchor={t.axis === "x" ? "middle" : "end"}
            >
              {t.label}
            </text>
          )
        )}
        {geometry.polylines.map((line, i) => (
          <path
            key={`c-${i}`}
            d={polylinePath(line.points, geometry.toSvg)}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={line.dashed ? "6 4" : undefined}
            className={line.color === "muted" ? "stroke-ink-light" : "stroke-brand-deep"}
          />
        ))}
      </svg>

      <div className="mt-3 space-y-3">
        {spec.sliders.map((s) => {
          const inputId = `${groupId}-${s.name}`;
          return (
            <div key={s.name}>
              <label htmlFor={inputId} className="flex items-baseline justify-between text-sm">
                <span className="text-ink-soft">
                  <MathText text={s.label} />
                </span>
                <span className="font-mono text-xs text-ink">
                  {Number.isInteger(values[s.name]) ? values[s.name] : values[s.name].toFixed(1)}
                </span>
              </label>
              <input
                id={inputId}
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={values[s.name]}
                onChange={(e) => setValues((v) => ({ ...v, [s.name]: Number(e.target.value) }))}
                className="mt-1 w-full accent-brand-deep"
              />
            </div>
          );
        })}
      </div>

      <figcaption className="mt-2 text-xs text-ink-light">
        Drag a slider to see the graph change. The dashed curve is the starting shape.
      </figcaption>
    </figure>
  );
}
