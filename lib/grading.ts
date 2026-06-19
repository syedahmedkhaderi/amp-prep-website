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

function gradeNumeric(q: Question, response: any): GradeResult {
  if (!q.numericAnswer) return { isCorrect: false, pointsAwarded: 0, correctAnswerText: "" };

  const rawInput: string = String(response?.value || "").trim();
  if (!rawInput) return { isCorrect: false, pointsAwarded: 0, correctAnswerText: "" };

  const target = q.numericAnswer.correctValue;
  const tol = q.numericAnswer.tolerance;

  // Try numeric comparison
  const parsed = parseFloat(rawInput);
  if (!isNaN(parsed)) {
    const isCorrect = Math.abs(parsed - target) <= tol + 1e-9;
    return {
      isCorrect,
      pointsAwarded: isCorrect ? q.points : 0,
      correctAnswerText: String(target),
    };
  }

  // Check accepted expressions (normalized)
  const normalized = rawInput.replace(/\s/g, "").toLowerCase();
  const accepted = q.numericAnswer.acceptedExpressions.map((e) => e.replace(/\s/g, "").toLowerCase());
  if (accepted.includes(normalized)) {
    return {
      isCorrect: true,
      pointsAwarded: q.points,
      correctAnswerText: String(target),
    };
  }

  return { isCorrect: false, pointsAwarded: 0, correctAnswerText: String(target) };
}
