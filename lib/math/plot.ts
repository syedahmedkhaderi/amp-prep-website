import { compileExpression, ExpressionSyntaxError } from "./expression";

/**
 * Turn a declarative plot spec into SVG-ready geometry.
 *
 * Desmos would be the obvious choice and cannot be used: its free API is
 * licensed for non-commercial use only, it loads from a CDN (which the deploy
 * target's CSP blocks), and it has no notion of the site's light and dark
 * themes. This module is the replacement. It is pure and deterministic, so the
 * output can be snapshot-tested and rendered on the server with no client
 * JavaScript at all.
 *
 * Everything here is arithmetic on plain objects. The React components in
 * components/lesson only translate the result into elements.
 */

export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface CurveSpec {
  /** Expression in terms of x, e.g. "x^2 - 3" or "1/(x-2)". */
  fn: string;
  label?: string;
  /** A token name resolved to a themed colour by the renderer, not a hex value. */
  color?: "primary" | "accent" | "muted";
  dashed?: boolean;
  /** Named constants the expression may use, e.g. { a: 2, h: 1, k: -3 }. */
  params?: Record<string, number>;
  /** Restrict the curve to part of the viewport. */
  domain?: { from: number; to: number };
}

export interface PointSpec {
  x: number;
  y: number;
  label?: string;
  /** Open circles mark excluded values, as at a removable discontinuity. */
  open?: boolean;
}

export interface SegmentSpec {
  from: { x: number; y: number };
  to: { x: number; y: number };
  label?: string;
  dashed?: boolean;
}

export interface RegionSpec {
  /** Shade where this inequality holds, e.g. { fn: "2x+1", side: "below" }. */
  fn: string;
  side: "above" | "below";
  params?: Record<string, number>;
}

export interface PlotSpec {
  kind: "cartesian";
  viewport?: Partial<Viewport>;
  curves?: CurveSpec[];
  points?: PointSpec[];
  segments?: SegmentSpec[];
  regions?: RegionSpec[];
  xLabel?: string;
  yLabel?: string;
  /** Alt text. Required: these are teaching materials read with screen readers. */
  description: string;
  showGrid?: boolean;
}

export interface NumberLineSpec {
  kind: "number-line";
  min: number;
  max: number;
  step?: number;
  /** Filled dot for an included endpoint, hollow for excluded. */
  marks?: { at: number; label?: string; open?: boolean }[];
  /** Shaded intervals, e.g. x >= 3 is { from: 3, to: max, openFrom: false }. */
  intervals?: { from: number; to: number; openFrom?: boolean; openTo?: boolean }[];
  description: string;
}

export interface UnitCircleSpec {
  kind: "unit-circle";
  /** Angles in degrees to mark, e.g. [0, 30, 45, 60, 90]. */
  angles?: number[];
  /** Draw the radius and its sine and cosine legs at this angle. */
  highlight?: number;
  description: string;
}

export type AnyPlotSpec = PlotSpec | NumberLineSpec | UnitCircleSpec;

// --- Output geometry -------------------------------------------------------

export interface Polyline {
  points: { x: number; y: number }[];
  color: "primary" | "accent" | "muted";
  dashed: boolean;
  label?: string;
}

export interface PlotGeometry {
  width: number;
  height: number;
  viewport: Viewport;
  /** Maps a data coordinate to an SVG coordinate. */
  toSvg: (x: number, y: number) => { x: number; y: number };
  polylines: Polyline[];
  points: (PointSpec & { svg: { x: number; y: number } })[];
  segments: { from: { x: number; y: number }; to: { x: number; y: number }; dashed: boolean; label?: string }[];
  regions: { path: string }[];
  gridLines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[];
  ticks: { x: number; y: number; label: string; axis: "x" | "y" }[];
  axes: { x1: number; y1: number; x2: number; y2: number }[];
  warnings: string[];
}

const DEFAULT_VIEWPORT: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const WIDTH = 480;
const HEIGHT = 360;
const PADDING = 28;

/** Samples across the width. Enough for a smooth curve without bloating the DOM. */
const SAMPLE_COUNT = 400;

/**
 * How far a curve may jump between adjacent samples before the line is treated
 * as discontinuous rather than steep, expressed as a fraction of the visible
 * height.
 *
 * Without this a rational function draws a near-vertical line straight through
 * its asymptote — the classic wrong-looking graph of 1/(x-2), where the segment
 * from y=-1000 to y=+1000 gets joined up and reads as part of the curve. Half
 * the viewport height is comfortably larger than any genuine steep slope that
 * survives sampling at this density, and small enough to catch the sign flip
 * across a pole.
 */
const DISCONTINUITY_JUMP_RATIO = 0.5;

function resolveViewport(partial?: Partial<Viewport>): Viewport {
  return { ...DEFAULT_VIEWPORT, ...(partial ?? {}) };
}

function makeProjector(vp: Viewport) {
  const spanX = vp.xMax - vp.xMin;
  const spanY = vp.yMax - vp.yMin;
  const innerW = WIDTH - PADDING * 2;
  const innerH = HEIGHT - PADDING * 2;
  return (x: number, y: number) => ({
    x: PADDING + ((x - vp.xMin) / spanX) * innerW,
    // SVG y grows downwards; data y grows upwards.
    y: PADDING + innerH - ((y - vp.yMin) / spanY) * innerH,
  });
}

/** Nice round tick spacing for a span, so labels stay readable. */
function tickStep(span: number): number {
  const raw = span / 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  if (normalized < 1.5) return magnitude;
  if (normalized < 3) return 2 * magnitude;
  if (normalized < 7) return 5 * magnitude;
  return 10 * magnitude;
}

function formatTick(value: number, step: number): string {
  const decimals = step < 1 ? Math.min(3, Math.ceil(-Math.log10(step))) : 0;
  const text = value.toFixed(decimals);
  return text === "-0" ? "0" : text;
}

/**
 * Sample a curve into one or more polylines, splitting wherever the function is
 * undefined or jumps across an asymptote.
 */
function sampleCurve(curve: CurveSpec, vp: Viewport, warnings: string[]): Polyline[] {
  let compiled;
  try {
    compiled = compileExpression(curve.fn, { parameters: Object.keys(curve.params ?? {}) });
  } catch (err) {
    if (err instanceof ExpressionSyntaxError) {
      warnings.push(`curve "${curve.fn}": ${err.message}`);
      return [];
    }
    throw err;
  }

  const from = Math.max(curve.domain?.from ?? vp.xMin, vp.xMin);
  const to = Math.min(curve.domain?.to ?? vp.xMax, vp.xMax);
  if (!(to > from)) return [];

  const jumpLimit = (vp.yMax - vp.yMin) * DISCONTINUITY_JUMP_RATIO;
  const runs: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];
  let previous: number | null = null;

  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const x = from + ((to - from) * i) / SAMPLE_COUNT;
    const y = compiled.evaluate({ x, ...(curve.params ?? {}) });

    if (!Number.isFinite(y)) {
      // Undefined here: end the run, do not bridge the gap.
      if (run.length > 1) runs.push(run);
      run = [];
      previous = null;
      continue;
    }

    if (previous !== null && Math.abs(y - previous) > jumpLimit) {
      // A jump this large across one sample step is a pole, not a slope.
      if (run.length > 1) runs.push(run);
      run = [];
    }

    // Points far outside the viewport are kept (so the line leaves the frame at
    // the right angle) but clamped, to avoid absurd SVG coordinates.
    const clamped = Math.max(vp.yMin - (vp.yMax - vp.yMin), Math.min(vp.yMax + (vp.yMax - vp.yMin), y));
    run.push({ x, y: clamped });
    previous = y;
  }
  if (run.length > 1) runs.push(run);

  return runs.map((points, index) => ({
    points,
    color: curve.color ?? "primary",
    dashed: curve.dashed ?? false,
    // Label only the first run, or a broken curve gets its name repeated.
    label: index === 0 ? curve.label : undefined,
  }));
}

export function renderPlot(spec: PlotSpec): PlotGeometry {
  const vp = resolveViewport(spec.viewport);
  const toSvg = makeProjector(vp);
  const warnings: string[] = [];

  const polylines = (spec.curves ?? []).flatMap((c) => sampleCurve(c, vp, warnings));

  const stepX = tickStep(vp.xMax - vp.xMin);
  const stepY = tickStep(vp.yMax - vp.yMin);
  const gridLines: PlotGeometry["gridLines"] = [];
  const ticks: PlotGeometry["ticks"] = [];

  if (spec.showGrid !== false) {
    for (let x = Math.ceil(vp.xMin / stepX) * stepX; x <= vp.xMax + 1e-9; x += stepX) {
      const a = toSvg(x, vp.yMin);
      const b = toSvg(x, vp.yMax);
      gridLines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, major: Math.abs(x) < 1e-9 });
      const axis = toSvg(x, 0);
      ticks.push({ x: axis.x, y: Math.min(Math.max(axis.y, PADDING), HEIGHT - PADDING), label: formatTick(x, stepX), axis: "x" });
    }
    for (let y = Math.ceil(vp.yMin / stepY) * stepY; y <= vp.yMax + 1e-9; y += stepY) {
      const a = toSvg(vp.xMin, y);
      const b = toSvg(vp.xMax, y);
      gridLines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, major: Math.abs(y) < 1e-9 });
      const axis = toSvg(0, y);
      ticks.push({ x: Math.min(Math.max(axis.x, PADDING), WIDTH - PADDING), y: axis.y, label: formatTick(y, stepY), axis: "y" });
    }
  }

  const originX = toSvg(0, vp.yMin);
  const originXTop = toSvg(0, vp.yMax);
  const originY = toSvg(vp.xMin, 0);
  const originYRight = toSvg(vp.xMax, 0);
  const axes = [
    { x1: originY.x, y1: originY.y, x2: originYRight.x, y2: originYRight.y },
    { x1: originX.x, y1: originX.y, x2: originXTop.x, y2: originXTop.y },
  ];

  const regions = (spec.regions ?? []).flatMap((region) => {
    let compiled;
    try {
      compiled = compileExpression(region.fn, { parameters: Object.keys(region.params ?? {}) });
    } catch (err) {
      if (err instanceof ExpressionSyntaxError) {
        warnings.push(`region "${region.fn}": ${err.message}`);
        return [];
      }
      throw err;
    }
    const top: string[] = [];
    for (let i = 0; i <= SAMPLE_COUNT; i++) {
      const x = vp.xMin + ((vp.xMax - vp.xMin) * i) / SAMPLE_COUNT;
      const raw = compiled.evaluate({ x, ...(region.params ?? {}) });
      const y = Number.isFinite(raw) ? Math.max(vp.yMin, Math.min(vp.yMax, raw)) : region.side === "below" ? vp.yMin : vp.yMax;
      const p = toSvg(x, y);
      top.push(`${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
    }
    const closeY = region.side === "below" ? vp.yMin : vp.yMax;
    const right = toSvg(vp.xMax, closeY);
    const left = toSvg(vp.xMin, closeY);
    top.push(`L ${right.x.toFixed(2)} ${right.y.toFixed(2)}`);
    top.push(`L ${left.x.toFixed(2)} ${left.y.toFixed(2)}`);
    top.push("Z");
    return [{ path: top.join(" ") }];
  });

  return {
    width: WIDTH,
    height: HEIGHT,
    viewport: vp,
    toSvg,
    polylines,
    points: (spec.points ?? []).map((p) => ({ ...p, svg: toSvg(p.x, p.y) })),
    segments: (spec.segments ?? []).map((s) => ({
      from: toSvg(s.from.x, s.from.y),
      to: toSvg(s.to.x, s.to.y),
      dashed: s.dashed ?? false,
      label: s.label,
    })),
    regions,
    gridLines,
    ticks,
    axes,
    warnings,
  };
}

// --- Number line -----------------------------------------------------------

export interface NumberLineGeometry {
  width: number;
  height: number;
  axis: { x1: number; y1: number; x2: number; y2: number };
  ticks: { x: number; label: string }[];
  marks: { x: number; open: boolean; label?: string }[];
  intervals: { x1: number; x2: number; openFrom: boolean; openTo: boolean }[];
}

export function renderNumberLine(spec: NumberLineSpec): NumberLineGeometry {
  const height = 90;
  const y = 46;
  const span = spec.max - spec.min;
  const project = (value: number) => PADDING + ((value - spec.min) / span) * (WIDTH - PADDING * 2);
  const step = spec.step ?? tickStep(span);

  const ticks: { x: number; label: string }[] = [];
  for (let v = Math.ceil(spec.min / step) * step; v <= spec.max + 1e-9; v += step) {
    ticks.push({ x: project(v), label: formatTick(v, step) });
  }

  return {
    width: WIDTH,
    height,
    axis: { x1: PADDING, y1: y, x2: WIDTH - PADDING, y2: y },
    ticks,
    marks: (spec.marks ?? []).map((m) => ({ x: project(m.at), open: m.open ?? false, label: m.label })),
    intervals: (spec.intervals ?? []).map((i) => ({
      x1: project(Math.max(i.from, spec.min)),
      x2: project(Math.min(i.to, spec.max)),
      openFrom: i.openFrom ?? false,
      openTo: i.openTo ?? false,
    })),
  };
}

// --- Unit circle -----------------------------------------------------------

export interface UnitCircleGeometry {
  size: number;
  centre: { x: number; y: number };
  radius: number;
  angles: { degrees: number; label: string; point: { x: number; y: number }; labelPoint: { x: number; y: number } }[];
  highlight: null | {
    degrees: number;
    point: { x: number; y: number };
    cosLeg: { x1: number; y1: number; x2: number; y2: number };
    sinLeg: { x1: number; y1: number; x2: number; y2: number };
  };
}

const COMMON_ANGLE_LABELS: Record<number, string> = {
  0: "0",
  30: "\\frac{\\pi}{6}",
  45: "\\frac{\\pi}{4}",
  60: "\\frac{\\pi}{3}",
  90: "\\frac{\\pi}{2}",
  120: "\\frac{2\\pi}{3}",
  135: "\\frac{3\\pi}{4}",
  150: "\\frac{5\\pi}{6}",
  180: "\\pi",
  210: "\\frac{7\\pi}{6}",
  225: "\\frac{5\\pi}{4}",
  240: "\\frac{4\\pi}{3}",
  270: "\\frac{3\\pi}{2}",
  300: "\\frac{5\\pi}{3}",
  315: "\\frac{7\\pi}{4}",
  330: "\\frac{11\\pi}{6}",
};

export function renderUnitCircle(spec: UnitCircleSpec): UnitCircleGeometry {
  const size = 320;
  const centre = { x: size / 2, y: size / 2 };
  const radius = size / 2 - 40;
  const place = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: centre.x + Math.cos(rad) * r, y: centre.y - Math.sin(rad) * r };
  };

  const angles = (spec.angles ?? [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]).map((d) => ({
    degrees: d,
    label: COMMON_ANGLE_LABELS[d] ?? `${d}^{\\circ}`,
    point: place(d, radius),
    labelPoint: place(d, radius + 20),
  }));

  let highlight: UnitCircleGeometry["highlight"] = null;
  if (typeof spec.highlight === "number") {
    const p = place(spec.highlight, radius);
    highlight = {
      degrees: spec.highlight,
      point: p,
      cosLeg: { x1: centre.x, y1: centre.y, x2: p.x, y2: centre.y },
      sinLeg: { x1: p.x, y1: centre.y, x2: p.x, y2: p.y },
    };
  }

  return { size, centre, radius, angles, highlight };
}

// --- Diagrams --------------------------------------------------------------

/**
 * Labelled geometry figures for the mensuration objectives: area, perimeter,
 * volume, surface area, the Pythagorean theorem and similar triangles.
 *
 * These are illustrations, not scale drawings — the label carries the
 * measurement, so a triangle labelled 3-4-5 is drawn in a readable shape rather
 * than to scale.
 */
export type DiagramSpec =
  | { kind: "triangle"; sides?: [string?, string?, string?]; angles?: [string?, string?, string?]; rightAngleAt?: 0 | 1 | 2; description: string }
  | { kind: "rectangle"; width?: string; height?: string; description: string }
  | { kind: "square"; side?: string; description: string }
  | { kind: "circle"; radius?: string; diameter?: string; description: string }
  | { kind: "trapezoid"; top?: string; bottom?: string; height?: string; description: string }
  | { kind: "cylinder"; radius?: string; height?: string; description: string }
  | { kind: "cone"; radius?: string; height?: string; slant?: string; description: string }
  | { kind: "sphere"; radius?: string; description: string }
  | { kind: "prism"; width?: string; height?: string; depth?: string; description: string };
