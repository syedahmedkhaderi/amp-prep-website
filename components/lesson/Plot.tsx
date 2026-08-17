import {
  renderPlot,
  renderNumberLine,
  renderUnitCircle,
  type PlotSpec,
  type NumberLineSpec,
  type UnitCircleSpec,
  type AnyPlotSpec,
} from "@/lib/math/plot";
import { Katex } from "@/components/ui/Katex";

/**
 * Renders a plot spec as inline SVG on the server.
 *
 * No client JavaScript and no external script: the geometry is computed in
 * lib/math/plot.ts and this only turns it into elements. Colours come from the
 * Tailwind palette through currentColor rather than hex literals, so a graph
 * inherits whatever the surrounding text is using.
 *
 * Every figure carries a description. These are teaching materials, and a graph
 * that is only meaningful visually is unusable to a student with a screen
 * reader, so the spec type makes the alt text non-optional.
 */

const COLOR_CLASS: Record<string, string> = {
  primary: "text-brand-deep",
  accent: "text-quiz-action",
  muted: "text-ink-light",
};

/**
 * Build an SVG path from curve points.
 *
 * renderPlot returns polylines in DATA coordinates, not SVG ones, so that the
 * geometry stays meaningful to test against: a parabola's vertex should read as
 * (1, -4), not as a pixel offset. Projection therefore belongs here. Feeding
 * the raw points straight to the `d` attribute drew every curve into a tiny
 * patch at the top-left corner, which looked like the graph rendering nothing
 * at all.
 */
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

function Cartesian({ spec }: { spec: PlotSpec }) {
  const g = renderPlot(spec);

  if (process.env.NODE_ENV !== "production" && g.warnings.length > 0) {
    console.warn("[plot] spec produced warnings:", g.warnings);
  }

  return (
    <svg
      viewBox={`0 0 ${g.width} ${g.height}`}
      className="w-full max-w-lg h-auto"
      role="img"
      aria-label={spec.description}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{spec.description}</title>

      {g.regions.map((r, i) => (
        <path key={`region-${i}`} d={r.path} className="fill-brand-600/10" />
      ))}

      {g.gridLines.map((line, i) => (
        <line
          key={`grid-${i}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          className="stroke-surface-border"
          strokeWidth={line.major ? 0 : 1}
        />
      ))}

      {g.axes.map((axis, i) => (
        <line
          key={`axis-${i}`}
          x1={axis.x1}
          y1={axis.y1}
          x2={axis.x2}
          y2={axis.y2}
          className="stroke-ink-light"
          strokeWidth={1.5}
        />
      ))}

      {g.ticks.map((tick, i) =>
        tick.label === "0" ? null : (
          <text
            key={`tick-${i}`}
            x={tick.axis === "x" ? tick.x : tick.x - 6}
            y={tick.axis === "x" ? tick.y + 14 : tick.y + 4}
            className="fill-ink-light"
            fontSize={10}
            textAnchor={tick.axis === "x" ? "middle" : "end"}
          >
            {tick.label}
          </text>
        )
      )}

      {g.regions.length > 0 &&
        g.polylines.length === 0 &&
        null /* a region with no boundary curve needs no line */}

      {g.polylines.map((line, i) => (
        <path
          key={`curve-${i}`}
          d={polylinePath(line.points, g.toSvg)}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={line.dashed ? "6 4" : undefined}
          className={`${COLOR_CLASS[line.color] ?? COLOR_CLASS.primary} stroke-current`}
        />
      ))}

      {g.segments.map((s, i) => (
        <line
          key={`seg-${i}`}
          x1={s.from.x}
          y1={s.from.y}
          x2={s.to.x}
          y2={s.to.y}
          strokeWidth={2}
          strokeDasharray={s.dashed ? "6 4" : undefined}
          className="stroke-quiz-action"
        />
      ))}

      {g.points.map((p, i) => (
        <g key={`pt-${i}`}>
          <circle
            cx={p.svg.x}
            cy={p.svg.y}
            r={4}
            className={p.open ? "fill-surface stroke-brand-deep" : "fill-brand-deep stroke-brand-deep"}
            strokeWidth={2}
          />
          {p.label && (
            <text x={p.svg.x + 8} y={p.svg.y - 8} className="fill-ink" fontSize={11}>
              {p.label}
            </text>
          )}
        </g>
      ))}

      {spec.xLabel && (
        <text x={g.width - 8} y={g.height / 2 - 8} className="fill-ink-soft" fontSize={11} textAnchor="end">
          {spec.xLabel}
        </text>
      )}
      {spec.yLabel && (
        <text x={g.width / 2 + 8} y={14} className="fill-ink-soft" fontSize={11}>
          {spec.yLabel}
        </text>
      )}
    </svg>
  );
}

function NumberLine({ spec }: { spec: NumberLineSpec }) {
  const g = renderNumberLine(spec);
  return (
    <svg
      viewBox={`0 0 ${g.width} ${g.height}`}
      className="w-full max-w-lg h-auto"
      role="img"
      aria-label={spec.description}
    >
      <title>{spec.description}</title>

      {g.intervals.map((iv, i) => (
        <line
          key={`iv-${i}`}
          x1={iv.x1}
          y1={g.axis.y1}
          x2={iv.x2}
          y2={g.axis.y1}
          className="stroke-brand-600"
          strokeWidth={6}
          strokeLinecap="butt"
          opacity={0.35}
        />
      ))}

      <line {...{ x1: g.axis.x1, y1: g.axis.y1, x2: g.axis.x2, y2: g.axis.y2 }} className="stroke-ink" strokeWidth={1.5} />

      {g.ticks.map((t, i) => (
        <g key={`t-${i}`}>
          <line x1={t.x} y1={g.axis.y1 - 5} x2={t.x} y2={g.axis.y1 + 5} className="stroke-ink-light" strokeWidth={1} />
          <text x={t.x} y={g.axis.y1 + 20} className="fill-ink-light" fontSize={10} textAnchor="middle">
            {t.label}
          </text>
        </g>
      ))}

      {g.marks.map((m, i) => (
        <circle
          key={`m-${i}`}
          cx={m.x}
          cy={g.axis.y1}
          r={5}
          strokeWidth={2}
          className={m.open ? "fill-surface stroke-brand-deep" : "fill-brand-deep stroke-brand-deep"}
        />
      ))}
    </svg>
  );
}

function UnitCircle({ spec }: { spec: UnitCircleSpec }) {
  const g = renderUnitCircle(spec);
  return (
    <div className="w-full max-w-sm">
      <svg viewBox={`0 0 ${g.size} ${g.size}`} className="w-full h-auto" role="img" aria-label={spec.description}>
        <title>{spec.description}</title>
        <line x1={g.centre.x - g.radius - 16} y1={g.centre.y} x2={g.centre.x + g.radius + 16} y2={g.centre.y} className="stroke-ink-light" strokeWidth={1} />
        <line x1={g.centre.x} y1={g.centre.y - g.radius - 16} x2={g.centre.x} y2={g.centre.y + g.radius + 16} className="stroke-ink-light" strokeWidth={1} />
        <circle cx={g.centre.x} cy={g.centre.y} r={g.radius} className="fill-none stroke-brand-deep" strokeWidth={2} />

        {g.angles.map((a) => (
          <circle key={a.degrees} cx={a.point.x} cy={a.point.y} r={3} className="fill-brand-600" />
        ))}

        {g.highlight && (
          <g>
            <line x1={g.centre.x} y1={g.centre.y} x2={g.highlight.point.x} y2={g.highlight.point.y} className="stroke-quiz-action" strokeWidth={2} />
            <line {...g.highlight.cosLeg} className="stroke-quiz-action" strokeWidth={1.5} strokeDasharray="4 3" />
            <line {...g.highlight.sinLeg} className="stroke-quiz-action" strokeWidth={1.5} strokeDasharray="4 3" />
          </g>
        )}
      </svg>
      {/* Angle labels are LaTeX, so they are rendered as text beneath rather
          than inside the SVG, where KaTeX markup cannot go. */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
        {g.angles.map((a) => (
          <span key={a.degrees} className="inline-flex items-center gap-1">
            <span className="text-ink-light">{a.degrees}°</span>
            <Katex math={a.label} />
          </span>
        ))}
      </div>
    </div>
  );
}

export function Plot({ spec }: { spec: AnyPlotSpec }) {
  if (spec.kind === "number-line") return <NumberLine spec={spec} />;
  if (spec.kind === "unit-circle") return <UnitCircle spec={spec} />;
  return <Cartesian spec={spec} />;
}
