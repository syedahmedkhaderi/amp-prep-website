import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { findRenderFailures, checkQuestion } from "@/lib/math/render-check";
import { toParts } from "@/lib/math/parse";

/**
 * The question bank once shipped 297 questions whose LaTeX failed to parse and
 * displayed as red raw source to students. The cause was invisible in the JSON
 * source, so only a test that actually renders the content catches it. This
 * suite is the gate: it runs the real splitter and the real KaTeX build over
 * every question in the bank.
 */

const QUESTIONS_PATH = path.resolve(process.cwd(), "data/generated/questions.json");

describe("math parser", () => {
  it("keeps a whole matrix environment in one segment", () => {
    const parts = toParts("The matrix \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} is square.");
    const math = parts.filter((p) => p.type !== "text");
    expect(math).toHaveLength(1);
    expect(math[0].content).toContain("\\end{pmatrix}");
  });

  it("carries brace and single-token script arguments into the segment", () => {
    for (const src of ["10^{3}", "\\log_{2} 8", "10^n", "x_i"]) {
      expect(findRenderFailures(src)).toEqual([]);
    }
  });

  it("consumes an optional argument, as in \\sqrt[3]{8}", () => {
    expect(findRenderFailures("\\sqrt[3]{-27} = -3")).toEqual([]);
  });

  it("does not pair two currency signs across a sentence", () => {
    // Without the prose guard this renders "40 and a pen costs" as italic math.
    const parts = toParts("A backpack costs $40 and a pen costs $2.");
    expect(parts.every((p) => p.type === "text")).toBe(true);
  });

  it("still pairs real math that happens to contain long words", () => {
    // The prose guard must not fire on expressions built from function names.
    for (const src of ["$LCM(12, 18) - GCF(24, 36)$", "$mass = density \\cdot volume$"]) {
      const math = toParts(src).filter((p) => p.type !== "text");
      expect(math).toHaveLength(1);
    }
  });

  it("reports genuinely broken math instead of passing it", () => {
    expect(findRenderFailures("$\\frac{1}{$").length).toBeGreaterThan(0);
  });
});

describe("question bank", () => {
  const questions: Record<string, unknown>[] = JSON.parse(
    fs.readFileSync(QUESTIONS_PATH, "utf-8")
  );

  it("has questions to check", () => {
    expect(questions.length).toBeGreaterThan(0);
  });

  it("contains no control characters left by JSON escape corruption", () => {
    // A single-backslash "\frac" inside a JSON string parses to a form feed
    // followed by "rac". Newlines and the CR of a CRLF are legitimate.
    const offenders: string[] = [];
    const scan = (v: unknown, id: string): void => {
      if (typeof v === "string") {
        for (let i = 0; i < v.length; i++) {
          const code = v.charCodeAt(i);
          if (code < 32 && code !== 0x0a && code !== 0x0d) {
            offenders.push(`${id}: 0x${code.toString(16)} before ${JSON.stringify(v.slice(i + 1, i + 8))}`);
          }
        }
      } else if (Array.isArray(v)) v.forEach((x) => scan(x, id));
      else if (v && typeof v === "object") Object.values(v).forEach((x) => scan(x, id));
    };
    for (const q of questions) scan(q, String(q.id));
    expect(offenders).toEqual([]);
  });

  it("renders every question without a KaTeX parse error", () => {
    const broken = questions
      .map((q) => ({ id: String(q.id), failures: checkQuestion(q) }))
      .filter((r) => r.failures.length > 0)
      .map((r) => `${r.id} [${r.failures[0].path}] ${r.failures[0].message}`);

    expect(broken).toEqual([]);
  });
});
