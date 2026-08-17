import { describe, it, expect } from "vitest";
import { renderPlot, renderNumberLine, renderUnitCircle } from "../lib/math/plot";
import { compileExpression, parseExpression, ExpressionSyntaxError } from "../lib/math/expression";

describe("expression parser", () => {
  const evaluate = (src: string, scope: Record<string, number> = {}) =>
    compileExpression(src, { parameters: Object.keys(scope).filter((k) => k !== "x") }).evaluate(scope);

  it("respects operator precedence and right-associative powers", () => {
    expect(evaluate("2+3*4")).toBe(14);
    expect(evaluate("2^3^2")).toBe(512);
  });

  it("binds unary minus below exponentiation", () => {
    expect(evaluate("-x^2", { x: 3 })).toBe(-9);
  });

  it("handles implicit multiplication", () => {
    expect(evaluate("2x", { x: 5 })).toBe(10);
    expect(evaluate("3(x+1)", { x: 2 })).toBe(9);
  });

  it("treats log as base 10 and ln as natural", () => {
    expect(evaluate("log(100)")).toBeCloseTo(2, 10);
    expect(evaluate("ln(e)")).toBeCloseTo(1, 10);
  });

  it("returns NaN at undefined points rather than throwing", () => {
    expect(Number.isNaN(evaluate("sqrt(-1)"))).toBe(true);
    expect(Number.isFinite(evaluate("1/(x-2)", { x: 2 }))).toBe(false);
  });

  it("rejects identifiers that could reach the prototype chain", () => {
    // Function and constant lookup uses a Map precisely so these miss instead
    // of resolving to Object.prototype members.
    for (const hostile of ["constructor", "__proto__", "toString", "process"]) {
      expect(() => parseExpression(hostile), hostile).toThrow(ExpressionSyntaxError);
    }
  });

  it("reports the position of a syntax error", () => {
    try {
      parseExpression("x +");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ExpressionSyntaxError);
      expect((err as ExpressionSyntaxError).position).toBeGreaterThan(0);
    }
  });
});

describe("renderPlot", () => {
  it("breaks the line at an asymptote instead of drawing through it", () => {
    // The classic wrong graph of 1/(x-2) joins y=-1000 to y=+1000 with a
    // vertical line that looks like part of the curve.
    const g = renderPlot({
      kind: "cartesian",
      description: "1/(x-2)",
      curves: [{ fn: "1/(x-2)" }],
      viewport: { xMin: -5, xMax: 5, yMin: -10, yMax: 10 },
    });
    expect(g.polylines.length).toBeGreaterThanOrEqual(2);
    for (const line of g.polylines) {
      const crosses = line.points.some((p) => Math.abs(p.x - 2) < 1e-6);
      expect(crosses).toBe(false);
    }
  });

  it("does not split a continuous curve", () => {
    const g = renderPlot({ kind: "cartesian", description: "parabola", curves: [{ fn: "x^2" }] });
    expect(g.polylines).toHaveLength(1);
  });

  it("puts a parabola's vertex where the algebra says it is", () => {
    const g = renderPlot({ kind: "cartesian", description: "shifted", curves: [{ fn: "(x-1)^2-4" }] });
    const lowest = g.polylines[0].points.reduce((a, b) => (b.y < a.y ? b : a));
    expect(lowest.x).toBeCloseTo(1, 1);
    expect(lowest.y).toBeCloseTo(-4, 1);
  });

  it("supports named parameters so a slider can drive the curve", () => {
    const g = renderPlot({
      kind: "cartesian",
      description: "vertex form",
      curves: [{ fn: "a*(x-h)^2+k", params: { a: 1, h: 2, k: -3 } }],
    });
    const lowest = g.polylines[0].points.reduce((a, b) => (b.y < a.y ? b : a));
    expect(lowest.x).toBeCloseTo(2, 1);
    expect(lowest.y).toBeCloseTo(-3, 1);
  });

  it("reports a bad expression as a warning instead of throwing", () => {
    // A lesson with one broken graph should still render; the verifier reads
    // these warnings and fails the build instead.
    const g = renderPlot({ kind: "cartesian", description: "bad", curves: [{ fn: "x +" }] });
    expect(g.warnings).toHaveLength(1);
    expect(g.polylines).toHaveLength(0);
  });

  it("is deterministic, so the geometry can be snapshot tested", () => {
    const spec = { kind: "cartesian" as const, description: "d", curves: [{ fn: "sin(x)" }] };
    expect(JSON.stringify(renderPlot(spec).polylines)).toBe(JSON.stringify(renderPlot(spec).polylines));
  });

  it("maps the origin to the middle of a symmetric viewport", () => {
    const g = renderPlot({ kind: "cartesian", description: "o", viewport: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 } });
    const origin = g.toSvg(0, 0);
    expect(origin.x).toBeCloseTo(g.width / 2, 6);
    expect(origin.y).toBeCloseTo(g.height / 2, 6);
  });
});

describe("renderNumberLine", () => {
  it("places marks proportionally along the axis", () => {
    const g = renderNumberLine({ kind: "number-line", min: 0, max: 10, marks: [{ at: 5 }], description: "n" });
    expect(g.marks[0].x).toBeCloseTo((g.axis.x1 + g.axis.x2) / 2, 6);
  });

  it("keeps an interval inside the visible range", () => {
    const g = renderNumberLine({
      kind: "number-line",
      min: -5,
      max: 5,
      intervals: [{ from: 3, to: 999, openFrom: true }],
      description: "x > 3",
    });
    expect(g.intervals[0].x2).toBeLessThanOrEqual(g.axis.x2 + 1e-6);
    expect(g.intervals[0].openFrom).toBe(true);
  });
});

describe("renderUnitCircle", () => {
  it("labels the common angles in radians", () => {
    const g = renderUnitCircle({ kind: "unit-circle", angles: [0, 30, 90], description: "u" });
    expect(g.angles.map((a) => a.label)).toEqual(["0", "\\frac{\\pi}{6}", "\\frac{\\pi}{2}"]);
  });

  it("drops the sine and cosine legs from the highlighted angle", () => {
    const g = renderUnitCircle({ kind: "unit-circle", highlight: 60, description: "u" });
    expect(g.highlight).not.toBeNull();
    // The cosine leg runs along the horizontal through the centre.
    expect(g.highlight!.cosLeg.y1).toBeCloseTo(g.centre.y, 6);
    expect(g.highlight!.cosLeg.y2).toBeCloseTo(g.centre.y, 6);
  });
});

describe("curve geometry is in data coordinates", () => {
  it("returns polyline points in data space, not SVG space", () => {
    // The renderers project these through toSvg themselves. Returning SVG
    // coordinates here once caused every curve to be drawn into a 13x6 pixel
    // patch in the corner, which looked like the graph rendering nothing.
    // Keeping data coordinates is also what makes the vertex assertions above
    // meaningful, so this pins the contract both sides depend on.
    const g = renderPlot({
      kind: "cartesian",
      description: "y = x",
      curves: [{ fn: "x" }],
      viewport: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
    });
    const points = g.polylines[0].points;
    expect(points[0].x).toBeCloseTo(-10, 6);
    expect(points[points.length - 1].x).toBeCloseTo(10, 6);
    // In SVG space the first x would be the 28px padding, never negative.
    expect(points[0].x).toBeLessThan(0);
  });

  it("projects the data origin to the middle of a symmetric viewport", () => {
    const g = renderPlot({
      kind: "cartesian",
      description: "o",
      curves: [{ fn: "x" }],
      viewport: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
    });
    const mid = g.polylines[0].points.find((p) => Math.abs(p.x) < 0.05)!;
    const projected = g.toSvg(mid.x, mid.y);
    expect(projected.x).toBeCloseTo(g.width / 2, 0);
    expect(projected.y).toBeCloseTo(g.height / 2, 0);
  });
});
