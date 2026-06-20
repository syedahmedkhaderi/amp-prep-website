/**
 * Grading unit tests for all question types.
 * Spec Section 18: "Grading for every question type including matching and
 * numeric tolerance."
 */

import { gradeAnswer } from "@/lib/grading";
import type { Question } from "@/lib/types";

function makeQ(overrides: Partial<Question>): Question {
  return {
    id: "test_q",
    examId: "exam1",
    topicId: "topic1",
    type: "single_mcq",
    stem: "Test question",
    difficulty: "easy",
    points: 1,
    explanationSteps: [],
    finalAnswer: "",
    distractorRationales: {},
    conceptSummary: "",
    source: "generated",
    status: "published",
    isFree: true,
    ...overrides,
  };
}

describe("Grading: single_mcq", () => {
  const q = makeQ({
    type: "single_mcq",
    options: [
      { id: "a", content: "2", isCorrect: false, orderIndex: 0 },
      { id: "b", content: "4", isCorrect: true, orderIndex: 1 },
      { id: "c", content: "6", isCorrect: false, orderIndex: 2 },
      { id: "d", content: "8", isCorrect: false, orderIndex: 3 },
    ],
  });

  test("correct option gets full points", () => {
    const result = gradeAnswer(q, { optionId: "b" });
    expect(result.isCorrect).toBe(true);
    expect(result.pointsAwarded).toBe(1);
  });

  test("wrong option gets zero", () => {
    const result = gradeAnswer(q, { optionId: "a" });
    expect(result.isCorrect).toBe(false);
    expect(result.pointsAwarded).toBe(0);
  });

  test("no answer gets zero", () => {
    const result = gradeAnswer(q, null);
    expect(result.isCorrect).toBe(false);
    expect(result.pointsAwarded).toBe(0);
  });
});

describe("Grading: multi_mcq", () => {
  const q = makeQ({
    type: "multi_mcq",
    points: 2,
    options: [
      { id: "a", content: "2", isCorrect: true, orderIndex: 0 },
      { id: "b", content: "4", isCorrect: false, orderIndex: 1 },
      { id: "c", content: "6", isCorrect: true, orderIndex: 2 },
      { id: "d", content: "8", isCorrect: false, orderIndex: 3 },
    ],
  });

  test("all correct selected gets full points", () => {
    const result = gradeAnswer(q, { optionIds: ["a", "c"] });
    expect(result.isCorrect).toBe(true);
    expect(result.pointsAwarded).toBe(2);
  });

  test("partial selection is wrong", () => {
    const result = gradeAnswer(q, { optionIds: ["a"] });
    expect(result.isCorrect).toBe(false);
    expect(result.pointsAwarded).toBe(0);
  });

  test("extra wrong option is wrong", () => {
    const result = gradeAnswer(q, { optionIds: ["a", "c", "b"] });
    expect(result.isCorrect).toBe(false);
    expect(result.pointsAwarded).toBe(0);
  });
});

describe("Grading: numeric with tolerance", () => {
  const q = makeQ({
    type: "numeric",
    numericAnswer: {
      correctValue: 3.14159,
      tolerance: 0.01,
      acceptedExpressions: ["pi"],
    },
  });

  test("exact value correct", () => {
    const result = gradeAnswer(q, { value: "3.14159" });
    expect(result.isCorrect).toBe(true);
  });

  test("within tolerance correct", () => {
    const result = gradeAnswer(q, { value: "3.15" });
    expect(result.isCorrect).toBe(true);
  });

  test("outside tolerance wrong", () => {
    const result = gradeAnswer(q, { value: "3.5" });
    expect(result.isCorrect).toBe(false);
  });

  test("accepted expression correct", () => {
    const result = gradeAnswer(q, { value: "pi" });
    expect(result.isCorrect).toBe(true);
  });
});

describe("Grading: matching with partial credit", () => {
  const q = makeQ({
    type: "matching",
    points: 4,
    matches: [
      { id: "m1", leftContent: "A", correctChoiceIndex: 0, orderIndex: 0 },
      { id: "m2", leftContent: "B", correctChoiceIndex: 1, orderIndex: 1 },
      { id: "m3", leftContent: "C", correctChoiceIndex: 2, orderIndex: 2 },
      { id: "m4", leftContent: "D", correctChoiceIndex: 3, orderIndex: 3 },
    ],
    matchChoices: ["1", "2", "3", "4"],
  });

  test("all correct gets full points", () => {
    const result = gradeAnswer(q, {
      answers: { m1: 0, m2: 1, m3: 2, m4: 3 },
    });
    expect(result.isCorrect).toBe(true);
    expect(result.pointsAwarded).toBe(4);
  });

  test("half correct gets half credit", () => {
    const result = gradeAnswer(q, {
      answers: { m1: 0, m2: 1, m3: 99, m4: 99 },
    });
    expect(result.isCorrect).toBe(false);
    expect(result.pointsAwarded).toBe(2);
  });
});
