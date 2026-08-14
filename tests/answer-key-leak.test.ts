import { describe, it, expect } from "vitest";
import { toClientSafe } from "@/lib/types";
import type { Question, QType } from "@/lib/types";

/**
 * The runner pages serialize questions into the page for the browser. Anything
 * left on the object is readable in devtools, which would both let a student
 * see the answer mid-exam and let anyone walk the whole 3,700-question bank.
 *
 * toClientSafe builds its result field by field, so it is correct by
 * construction today. These tests exist so it stays that way: a future field
 * added to Question is only safe if someone deliberately decides it is, and a
 * spread introduced here would fail loudly instead of quietly shipping the
 * answer key.
 */

const SECRET_KEYS = [
  "isCorrect",
  "is_correct",
  "correctChoiceIndex",
  "correct_choice_index",
  "explanation",
  "explanationSteps",
  "explanation_steps",
  "distractorRationales",
  "distractor_rationales",
  "finalAnswer",
  "final_answer",
  "numericAnswer",
  "numeric_answer",
  "conceptSummary",
  "concept_summary",
];

/** A question of the given type carrying every secret a real one would. */
function loadedQuestion(type: QType): Question {
  return {
    id: "q_test",
    examId: "e1",
    topicId: "t1",
    type,
    stem: "What is $2+2$?",
    difficulty: "easy",
    points: 1,
    explanation: "Because it is.",
    explanationSteps: ["Add them.", "Get four."],
    distractorRationales: { "3": "Off by one." },
    finalAnswer: "4",
    conceptSummary: "Addition.",
    topicName: "Arithmetic",
    topicSlug: "arithmetic",
    options: [
      { id: "o1", content: "3", isCorrect: false, orderIndex: 0 },
      { id: "o2", content: "4", isCorrect: true, orderIndex: 1 },
    ],
    matches: [
      { id: "m1", leftContent: "2+2", correctChoiceIndex: 1, orderIndex: 0 },
      { id: "m2", leftContent: "3+3", correctChoiceIndex: 0, orderIndex: 1 },
    ],
    matchChoices: ["6", "4"],
    numericAnswer: { value: 4, tolerance: 0, accepted: ["4"] },
  } as unknown as Question;
}

/** Every key appearing anywhere in the serialized payload. */
function allKeys(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((v) => allKeys(v, found));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      found.add(k);
      allKeys(v, found);
    }
  }
  return found;
}

const TYPES: QType[] = [
  "single_mcq",
  "multi_mcq",
  "fill_blank",
  "matching",
  "numeric",
] as unknown as QType[];

describe("client-safe questions", () => {
  for (const type of TYPES) {
    it(`strips every answer key from a ${type} question`, () => {
      const safe = toClientSafe(loadedQuestion(type));
      const keys = allKeys(safe);
      const leaked = SECRET_KEYS.filter((k) => keys.has(k));
      expect(leaked).toEqual([]);
    });

    it(`leaks no answer text in the serialized ${type} payload`, () => {
      // Serialization is what actually reaches the browser, so assert on it.
      const json = JSON.stringify(toClientSafe(loadedQuestion(type)));
      expect(json).not.toContain("Because it is.");
      expect(json).not.toContain("Off by one.");
      expect(json).not.toContain("Add them.");
      expect(json).not.toContain("Addition.");
      for (const key of SECRET_KEYS) {
        expect(json, `payload contains "${key}"`).not.toContain(`"${key}"`);
      }
    });
  }

  it("keeps what the runner actually needs to draw the question", () => {
    const safe = toClientSafe(loadedQuestion("single_mcq" as QType));
    expect(safe.stem).toBe("What is $2+2$?");
    expect(safe.options?.map((o) => o.content)).toEqual(["3", "4"]);
    expect(safe.matches?.map((m) => m.leftContent)).toEqual(["2+2", "3+3"]);
    expect(safe.matchChoices).toEqual(["6", "4"]);
  });

  it("preserves option order so positions stay stable", () => {
    const safe = toClientSafe(loadedQuestion("single_mcq" as QType));
    expect(safe.options?.map((o) => o.orderIndex)).toEqual([0, 1]);
  });
});
