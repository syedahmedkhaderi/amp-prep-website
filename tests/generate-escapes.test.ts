/**
 * The producer side of the LaTeX corruption.
 *
 * tests/latex-render.test.ts gates the question bank as it stands; this file
 * gates the code that writes it, so a regenerate cannot refill the bank with
 * the control characters that shipped 297 broken questions.
 *
 * The fixtures are synthetic raw model output. Every string here is written
 * with String.raw so the backslashes are the ones a model actually emits,
 * rather than ones TypeScript has already resolved.
 */

import { describe, expect, it } from "vitest";
import { parseModelResponse, sanitizeModelJson } from "@/scripts/generate-questions";
import { collectStrings, findRenderFailures } from "@/lib/math/render-check";

/** Codes that only ever appear as a mangled escape: \b \t \v \f and a lone \r. */
function controlChars(value: unknown): { path: string; code: number }[] {
  const found: { path: string; code: number }[] = [];
  for (const { path, text } of collectStrings(value)) {
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 32 || code === 0x0a) continue;
      if (code === 0x0d && text.charCodeAt(i + 1) === 0x0a) continue;
      found.push({ path, code });
    }
  }
  return found;
}

// One response carrying every escape that corrupted the bank, plus a
// legitimate paragraph break in the stem. \begin/\end and \cdot are commands
// that are not valid JSON escapes at all, so before the fix this response did
// not corrupt, it threw, and the question was discarded.
const RAW_RESPONSE = String.raw`{
  "type": "single_mcq",
  "stem": "Consider the following three real numbers:\n\nLet $x = \frac{3}{4}$, $y = 2 \times 10^{3}$, and $z = \sqrt{16} \cdot 2$. Evaluate $\left( x + y \right)$ for the matrix $\begin{array}{cc} 1 & 2 \\ 3 & 4 \end{array}$.",
  "options": [{"content": "$\text{exactly } \frac{1}{2}$", "is_correct": true}],
  "distractor_rationales": {"$2 \times 10^{3}$": "Confuses the exponent."},
  "final_answer": "$\frac{1}{2}$",
  "explanation_steps": ["Apply $\frac{a}{b} \times \frac{c}{d}$", "Then $\alpha \rightarrow \beta$", "List:\newline\newline done"],
  "concept_summary": "Fraction multiplication"
}`;

describe("sanitizeModelJson", () => {
  it("parses a response that mixes single-backslash LaTeX with a real newline", () => {
    const parsed = parseModelResponse(RAW_RESPONSE);
    expect(parsed).not.toBeNull();
  });

  it("leaves no control characters anywhere in the parsed question", () => {
    const parsed = parseModelResponse(RAW_RESPONSE);
    expect(controlChars(parsed)).toEqual([]);
  });

  it("recovers each corrupting command as literal LaTeX", () => {
    const parsed = parseModelResponse(RAW_RESPONSE)!;
    const all = collectStrings(parsed).map((s) => s.text).join("\n");

    for (const command of [
      "\\frac", "\\times", "\\text{", "\\begin{array}", "\\end{array}",
      "\\right", "\\rightarrow", "\\cdot", "\\sqrt", "\\left", "\\alpha", "\\beta",
    ]) {
      expect(all, `missing ${command}`).toContain(command);
    }
  });

  it("preserves the paragraph break in the stem as a real newline", () => {
    const parsed = parseModelResponse(RAW_RESPONSE)!;
    expect(parsed.stem).toContain("\n\n");
    expect(parsed.stem).toContain("Consider the following three real numbers:\n\n");
    // and not as a literal backslash-n that would print on screen
    expect(parsed.stem).not.toContain("\\n\\n");
  });

  it("produces LaTeX that actually renders", () => {
    const parsed = parseModelResponse(RAW_RESPONSE)!;
    const failures = collectStrings(parsed).flatMap(({ path, text }) =>
      findRenderFailures(text).map((f) => `${path}: ${f.segment} -> ${f.message}`)
    );
    expect(failures).toEqual([]);
  });

  it("leaves correctly escaped output untouched", () => {
    const correct = JSON.stringify({ stem: "A break\n\nthen $\\frac{1}{2}$ and a quote \" here" });
    expect(sanitizeModelJson(correct)).toBe(correct);
    expect(parseModelResponse(correct)).toEqual(JSON.parse(correct));
  });

  it("never yields a tab, even where a tab was arguably meant", () => {
    // \t is read as a command unconditionally. A tab in question prose is not
    // a thing the pipeline produces, and the alternative is shipping 0x09.
    const raw = String.raw`{"stem":"columns\tseparated"}`;
    const parsed = parseModelResponse(raw)!;
    expect(parsed.stem).toBe("columns\\tseparated");
    expect(controlChars(parsed)).toEqual([]);
  });

  it("keeps \\n as a newline when the letters after it are prose, not a command", () => {
    const raw = String.raw`{"stem":"Answer:\nnone of the above\nnegative values only"}`;
    const parsed = parseModelResponse(raw)!;
    expect(parsed.stem.split("\n")).toHaveLength(3);
    expect(parsed.stem).not.toContain("\\n");
  });

  it("reads \\neq and \\nabla as commands rather than newlines", () => {
    const raw = String.raw`{"stem":"$x \neq y$ and $\nabla f$"}`;
    const parsed = parseModelResponse(raw)!;
    expect(parsed.stem).toBe("$x \\neq y$ and $\\nabla f$");
    expect(findRenderFailures(parsed.stem)).toEqual([]);
  });

  it("keeps a real unicode escape but treats \\underline as a command", () => {
    const raw = String.raw`{"stem":"90\u00b0 in the blank \underline{\quad}"}`;
    const parsed = parseModelResponse(raw)!;
    expect(parsed.stem).toBe("90° in the blank \\underline{\\quad}");
  });

  it("rejects a response it cannot clean instead of returning damaged text", () => {
    // The backstop: a control character reaching the parsed object by any
    // route at all, here a well-formed \u escape for a tab, drops the question
    // so the caller retries rather than writing corruption to the bank.
    const raw = String.raw`{"stem":"column\u0009separated"}`;
    expect(parseModelResponse(raw)).toBeNull();
  });

  it("reads \\newline as a command, not as an escape plus prose", () => {
    // \newline is the pervasive n-command in this bank after \neq, and
    // lib/math/parse.ts turns it into a line break at render time, so losing
    // it to a line feed would be silent.
    const parsed = parseModelResponse(RAW_RESPONSE)!;
    expect(parsed.explanation_steps.at(-1)).toBe("List:\\newline\\newline done");
  });

  it("checks object keys, which collectStrings alone does not walk", () => {
    // distractor_rationales is keyed by option text, so a key is user visible
    // LaTeX. The bank still carries corruption here for exactly this reason.
    const parsed = parseModelResponse(RAW_RESPONSE)!;
    expect(Object.keys(parsed.distractor_rationales)).toEqual(["$2 \\times 10^{3}$"]);

    const corruptKey = '{"distractor_rationales":{"$2 \\u0009imes 10$":"why"}}';
    expect(parseModelResponse(corruptKey)).toBeNull();
  });

  it("drops rather than guesses when a line feed precedes a lone letter", () => {
    // Indistinguishable from a mangled \ne / \nu / \ni, and neither reading
    // is safe to assume, so the question is retried instead.
    expect(parseModelResponse(String.raw`{"stem":"$55/12 \ne 6$"}`)).toBeNull();
    expect(parseModelResponse(String.raw`{"stem":"Values:\ne = 2.718"}`)).toBeNull();
  });

  it("keeps a matrix row separator in an otherwise non-compliant response", () => {
    // `\\\\` before whitespace is the row separator, not one escaped
    // backslash. Reading it the other way merges every row of the matrix.
    const raw = String.raw`{"stem":"$\begin{array}{cc} 1 & 2 \\ 3 & 4 \end{array}$"}`;
    const parsed = parseModelResponse(raw)!;
    expect(parsed.stem).toBe("$\\begin{array}{cc} 1 & 2 \\\\ 3 & 4 \\end{array}$");
    expect(findRenderFailures(parsed.stem)).toEqual([]);
    expect(controlChars(parsed)).toEqual([]);
  });

  it("does not apply the row-separator rule to a compliant response", () => {
    // The same shape in correct JSON means one literal backslash, and a
    // response that needed no escaping is never put through that pass.
    const correct = JSON.stringify({ stem: "a literal \\ backslash and \\% percent" });
    expect(sanitizeModelJson(correct)).toBe(correct);
    expect(parseModelResponse(correct)!.stem).toBe("a literal \\ backslash and \\% percent");
  });
});
