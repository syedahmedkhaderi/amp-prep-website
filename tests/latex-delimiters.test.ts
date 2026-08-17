import { describe, it, expect } from "vitest";
import { wrapBareLatex } from "@/scripts/repair-latex-delimiters";

/**
 * The bank shipped 243 questions whose LaTeX had no $...$ around it, so readers
 * saw `1.25 \times 10^{2}` as source. These lock the repair's boundaries: it
 * must wrap real maths and must not touch prose or currency.
 */
describe("wrapBareLatex", () => {
  it("wraps a bare expression", () => {
    expect(wrapBareLatex(String.raw`1.25 \times 10^{2}`)).toBe(String.raw`$1.25 \times 10^{2}$`);
  });

  it("wraps only the maths inside a prose list", () => {
    const input = String.raw`1: 0.025, 2: -0.04, 3: 4.5 \times 10^{-4}, 4: 0.785`;
    expect(wrapBareLatex(input)).toBe(String.raw`1: 0.025, 2: -0.04, 3: $4.5 \times 10^{-4}$, 4: 0.785`);
  });

  it("handles one level of brace nesting", () => {
    // A flat brace pattern cannot match \frac's first argument here, so these
    // expressions were skipped entirely before.
    expect(wrapBareLatex(String.raw`h = \frac{A - 2\pi r^{2}}{2\pi r}`)).toContain(
      String.raw`\frac{A - 2\pi r^{2}}{2\pi r}$`
    );
  });

  it("wraps glued algebra that has no backslash command", () => {
    expect(wrapBareLatex("2x^{6}y^{-2} and more")).toBe("$2x^{6}y^{-2}$ and more");
  });

  it("never breaks a one-letter word out of prose", () => {
    // The bug that made the first attempt unusable: the `f` of "of" read as a
    // variable, giving "the set o$f \underline{\quad}$ numbers".
    const out = wrapBareLatex(String.raw`the set of \underline{\quad} numbers`);
    expect(out).toBe(String.raw`the set of $\underline{\quad}$ numbers`);
  });

  it("leaves a currency amount alone", () => {
    const input = "A shirt costs $48, what is the sale price?";
    expect(wrapBareLatex(input)).toBe(input);
  });

  it("leaves ordinary prose alone", () => {
    for (const s of ["Consider the set of all numbers.", "She scored 8 out of 10."]) {
      expect(wrapBareLatex(s)).toBe(s);
    }
  });

  it("does not re-wrap text that is already delimited", () => {
    const input = String.raw`The value $\sqrt{5}$ is irrational.`;
    expect(wrapBareLatex(input)).toBe(input);
  });

  it("leaves layout-only commands unwrapped", () => {
    // \newline is not maths; wrapping it hands KaTeX something it rejects.
    expect(wrapBareLatex(String.raw`Pick one.\newline\newline $$\sqrt{4}$$`)).toContain(
      String.raw`\newline\newline`
    );
  });
});
