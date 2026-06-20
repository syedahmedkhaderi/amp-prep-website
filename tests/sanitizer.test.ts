/**
 * LaTeX sanitizer tests.
 * Spec Section 18: "The LaTeX sanitizer accepts valid and rejects invalid input."
 */

import { validateLatex, checkNotation } from "@/lib/math/sanitizer";

describe("LaTeX validation", () => {
  test("valid inline math passes", () => {
    const result = validateLatex("What is $x^{2} + 1$?");
    expect(result.ok).toBe(true);
  });

  test("valid display math passes", () => {
    const result = validateLatex("$$\\frac{a}{b} = \\frac{c}{d}$$");
    expect(result.ok).toBe(true);
  });

  test("valid complex expression passes", () => {
    const result = validateLatex("$\\sqrt{x^2 + y^2}$");
    expect(result.ok).toBe(true);
  });

  test("plain text with no math passes", () => {
    const result = validateLatex("This has no math.");
    expect(result.ok).toBe(true);
  });
});

describe("Notation checks", () => {
  test("detects raw caret notation", () => {
    const result = checkNotation("What is x^2?");
    expect(result.ok).toBe(false);
  });

  test("detects arrow notation", () => {
    const result = checkNotation("This leads to that -> result");
    expect(result.ok).toBe(false);
  });

  test("detects asterisk multiplication", () => {
    const result = checkNotation("3 * 4 = 12");
    expect(result.ok).toBe(false);
  });

  test("clean LaTeX passes", () => {
    const result = checkNotation("$x^{2}$ equals $\\frac{a}{b}$");
    expect(result.ok).toBe(true);
  });
});
