import { describe, it, expect } from "vitest";
import { gradeAnswer } from "@/lib/grading";
import type { Question } from "@/lib/types";

/**
 * Regression tests for gradeNumeric.
 *
 * `numeric` is the only free-text answer type in the product: every other type
 * routes to a choice grader. So this function is the whole surface on which a
 * student can type a right answer and be told it is wrong.
 *
 * It previously ran `parseFloat` first and returned unconditionally on success.
 * parseFloat parses a *prefix*, so parseFloat("1/2") is 1 and
 * parseFloat("200*pi") is 200. That broke grading in both directions at once,
 * and made the acceptedExpressions list below it unreachable dead code. A
 * census of data/generated/questions.json found 119 questions carrying an
 * accepted form no student could ever get credit for.
 */

function numericQuestion(
  value: number,
  tolerance: number,
  accepted: string[] = []
): Question {
  return {
    id: "q_test",
    examCode: "AMP1",
    topicId: "t_test",
    type: "numeric",
    stem: "Test question",
    difficulty: "medium",
    points: 1,
    numericAnswer: {
      correctValue: value,
      tolerance,
      acceptedExpressions: accepted,
    },
  } as unknown as Question;
}

const grade = (q: Question, typed: string) => gradeAnswer(q, { value: typed });

describe("gradeNumeric: accepted forms are reachable", () => {
  it("accepts a fraction when the key is the decimal (the 119-question defect)", () => {
    const q = numericQuestion(0.5, 0, ["1/2"]);
    expect(grade(q, "1/2").isCorrect).toBe(true);
  });

  it("accepts a negative fraction", () => {
    const q = numericQuestion(-0.3333333333, 0.001, ["-1/3"]);
    expect(grade(q, "-1/3").isCorrect).toBe(true);
  });

  it("still accepts the decimal form of the same answer", () => {
    const q = numericQuestion(-0.3333333333, 0.001, ["-1/3"]);
    expect(grade(q, "-0.333").isCorrect).toBe(true);
  });

  it("accepts a fraction whose value matches even if it is not listed", () => {
    const q = numericQuestion(16.4, 0.01, []);
    expect(grade(q, "82/5").isCorrect).toBe(true);
  });

  it("ignores whitespace and case in an accepted form", () => {
    const q = numericQuestion(0, 0, ["2\\pi"]);
    expect(grade(q, "  2\\PI ").isCorrect).toBe(true);
  });

  it("does not fail a student for omitting $ math delimiters", () => {
    const q = numericQuestion(0, 0, ["$x+1$"]);
    expect(grade(q, "x+1").isCorrect).toBe(true);
  });
});

describe("gradeNumeric: the prefix hijack is closed in both directions", () => {
  it("rejects a fraction that only matches on its numerator", () => {
    // parseFloat("1/2") === 1, so this used to be marked CORRECT.
    const q = numericQuestion(1, 0, []);
    expect(grade(q, "1/2").isCorrect).toBe(false);
  });

  it("rejects an expression that only matches on its leading number", () => {
    // parseFloat("200*pi") === 200.
    const q = numericQuestion(200, 0, []);
    expect(grade(q, "200*pi").isCorrect).toBe(false);
  });

  it("rejects trailing garbage after a correct number", () => {
    const q = numericQuestion(5, 0, []);
    expect(grade(q, "5x").isCorrect).toBe(false);
  });

  it("does not divide by zero", () => {
    const q = numericQuestion(0, 0, []);
    expect(grade(q, "1/0").isCorrect).toBe(false);
  });
});

describe("gradeNumeric: ordinary numbers still grade", () => {
  it("accepts an exact integer", () => {
    expect(grade(numericQuestion(5, 0), "5").isCorrect).toBe(true);
  });

  it("accepts a value inside tolerance", () => {
    expect(grade(numericQuestion(3.14, 0.01), "3.15").isCorrect).toBe(true);
  });

  it("rejects a value outside tolerance", () => {
    expect(grade(numericQuestion(3.14, 0.01), "3.2").isCorrect).toBe(false);
  });

  it("accepts scientific notation", () => {
    expect(grade(numericQuestion(1500, 0), "1.5e3").isCorrect).toBe(true);
  });

  it("rejects an empty answer", () => {
    expect(grade(numericQuestion(5, 0), "  ").isCorrect).toBe(false);
  });
});

/**
 * The fix does NOT rescue this class, and that is deliberate — recording it as a
 * test so the limitation is visible rather than assumed away.
 *
 * Some questions key a symbolic answer as `value: 0` with the real answer only
 * in the accepted list. A student typing the literal "0" matches the numeric
 * target and scores; one typing an equivalent-but-differently-written form of
 * the real answer still fails. That is a content defect in the bank (41
 * questions have `value: 0`), not something the grader can infer, and it needs
 * a content pass rather than a code change.
 */
describe("gradeNumeric: known remaining limitation, symbolic answers", () => {
  it("still scores a meaningless 0 against a value:0 placeholder", () => {
    const q = numericQuestion(0, 0, ["\\frac{P-2w}{2}"]);
    expect(grade(q, "0").isCorrect).toBe(true);
  });

  it("still fails an equivalent form not spelled exactly as listed", () => {
    const q = numericQuestion(0, 0, ["\\frac{P-2w}{2}"]);
    expect(grade(q, "(P-2w)/2").isCorrect).toBe(false);
  });
});
