/**
 * Server side grading logic for all question types. Spec Section 16:
 * grading is always server side, never client side.
 */

import type { Question } from "@/lib/types";

export interface GradeResult {
  isCorrect: boolean;
  pointsAwarded: number;
  correctAnswerText: string;
}

export function gradeAnswer(question: Question, response: any): GradeResult {
  switch (question.type) {
    case "single_mcq":
    case "fill_blank":
      return gradeChoice(question, response);
    case "multi_mcq":
      return gradeMultiChoice(question, response);
    case "matching":
      return gradeMatching(question, response);
    case "numeric":
      return gradeNumeric(question, response);
    default:
      return { isCorrect: false, pointsAwarded: 0, correctAnswerText: "" };
  }
}

function gradeChoice(q: Question, response: any): GradeResult {
  if (!q.options) return { isCorrect: false, pointsAwarded: 0, correctAnswerText: "" };
  const correct = q.options.find((o) => o.isCorrect);
  if (!correct) return { isCorrect: false, pointsAwarded: 0, correctAnswerText: "" };

  const isCorrect = response?.optionId === correct.id;
  return {
    isCorrect,
    pointsAwarded: isCorrect ? q.points : 0,
    correctAnswerText: correct.content,
  };
}

function gradeMultiChoice(q: Question, response: any): GradeResult {
  if (!q.options) return { isCorrect: false, pointsAwarded: 0, correctAnswerText: "" };
  const correctIds = new Set(q.options.filter((o) => o.isCorrect).map((o) => o.id));
  const selectedIds = new Set<string>((response?.optionIds || []) as string[]);

  if (correctIds.size === 0) return { isCorrect: false, pointsAwarded: 0, correctAnswerText: "" };

  const isCorrect =
    correctIds.size === selectedIds.size &&
    [...correctIds].every((id) => selectedIds.has(id));

  const correctText = q.options
    .filter((o) => o.isCorrect)
    .map((o) => o.content)
    .join(", ");

  return {
    isCorrect,
    pointsAwarded: isCorrect ? q.points : 0,
    correctAnswerText: correctText,
  };
}

function gradeMatching(q: Question, response: any): GradeResult {
  if (!q.matches) return { isCorrect: false, pointsAwarded: 0, correctAnswerText: "" };

  const answers: Record<string, number> = response?.answers || {};
  let allCorrect = true;
  let correctCount = 0;

  for (const match of q.matches) {
    const given = answers[match.id];
    if (given === match.correctChoiceIndex) {
      correctCount++;
    } else {
      allCorrect = false;
    }
  }

  // Partial credit: proportional
  const ratio = q.matches.length > 0 ? correctCount / q.matches.length : 0;

  const correctText = q.matches
    .map((m) => `${m.leftContent} = ${q.matchChoices?.[m.correctChoiceIndex] || "?"}`)
    .join("; ");

  return {
    isCorrect: allCorrect,
    pointsAwarded: Math.round(q.points * ratio * 100) / 100,
    correctAnswerText: correctText,
  };
}

/**
 * A number and nothing else: optional sign, digits, optional decimal part,
 * optional exponent. Deliberately stricter than parseFloat, which stops at the
 * first character it cannot use and reports success on the prefix.
 */
const FULL_NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * Shared normalisation for comparing a typed answer against an accepted form.
 * Drops whitespace, lowercases, and strips the `$` math delimiters and `\left`
 * `\right` sizing prefixes that appear in accepted forms lifted out of LaTeX,
 * so a student is not failed for not typing the delimiters.
 */
function normalizeAnswer(value: string): string {
  return String(value)
    .replace(/\\left|\\right/g, "")
    .replace(/[$\s]/g, "")
    .toLowerCase();
}

function gradeNumeric(q: Question, response: any): GradeResult {
  if (!q.numericAnswer) return { isCorrect: false, pointsAwarded: 0, correctAnswerText: "" };

  const rawInput: string = String(response?.value || "").trim();
  if (!rawInput) return { isCorrect: false, pointsAwarded: 0, correctAnswerText: "" };

  const target = q.numericAnswer.correctValue;
  const tol = q.numericAnswer.tolerance;

  const correct = (): GradeResult => ({
    isCorrect: true,
    pointsAwarded: q.points,
    correctAnswerText: String(target),
  });

  // Accepted forms are checked FIRST, and the numeric path only accepts an
  // input that is a number in its entirety.
  //
  // This used to be the other way round: parseFloat ran first and returned
  // unconditionally whenever it produced a number. parseFloat parses a *prefix*,
  // so parseFloat("1/2") is 1 and parseFloat("200*pi") is 200. That single fact
  // broke grading in both directions at once:
  //
  //   false negative - a question keyed value 0.5 with accepted ["1/2"] marked a
  //     student typing "1/2" wrong, because the prefix parsed to 1 and the
  //     accepted list below was unreachable dead code. 119 questions in the bank
  //     carry an accepted form that no student could ever get credit for.
  //   false positive - a question keyed value 1 also marked "1/2" *correct*, for
  //     exactly the same reason.
  //
  // Marking a correct student wrong on a paid exam-prep site is the worse of the
  // two, but both are fixed by the same change, so neither is left standing.
  const normalized = normalizeAnswer(rawInput);
  const accepted = q.numericAnswer.acceptedExpressions.map(normalizeAnswer);
  if (normalized && accepted.includes(normalized)) return correct();

  // Whole-string number only. A partial match falls through to the forms below
  // rather than silently deciding the question.
  if (FULL_NUMBER.test(rawInput)) {
    const parsed = Number(rawInput);
    const isCorrect = Math.abs(parsed - target) <= tol + 1e-9;
    return {
      isCorrect,
      pointsAwarded: isCorrect ? q.points : 0,
      correctAnswerText: String(target),
    };
  }

  // A plain fraction is the one non-decimal form students type often enough to
  // be worth evaluating, and it is unambiguous. Anything richer than this is a
  // symbolic-algebra problem and deliberately out of scope: it belongs in the
  // accepted list, not in a hand-rolled expression parser.
  const fraction = rawInput.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator !== 0) {
      const value = Number(fraction[1]) / denominator;
      if (Math.abs(value - target) <= tol + 1e-9) return correct();
    }
  }

  return { isCorrect: false, pointsAwarded: 0, correctAnswerText: String(target) };
}
