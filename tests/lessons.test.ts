import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { allLessons } from "../data/lessons";
import { verifyLessons } from "../scripts/verify-lessons";
import { toClientSafe } from "../lib/types";
import type { Question } from "../lib/types";

/**
 * The lesson content gate, run offline so it can sit in CI.
 *
 * Same idea as tests/latex-render.test.ts for the question bank: content is
 * data, data can be wrong, and the failure mode is a student being shown a
 * broken graph or a wall of unreadable prose.
 */

const skillsFile = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../data/generated/skills.json"), "utf-8")
);
const validSkills = new Set<string>(skillsFile.skills.map((s: any) => s.slug));

const bank: { id: string; status?: string }[] = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../data/generated/questions.json"), "utf-8")
);
// The bank JSON has no status column; seed.ts decides that. For this test any
// question present in the bank is treated as referenceable, and the stricter
// published-only check runs in scripts/verify-lessons.ts against the database.
const knownQuestionIds = new Set(bank.map((q) => q.id));

describe("authored lessons", () => {
  it("passes every content gate", () => {
    const problems = verifyLessons(allLessons, validSkills, knownQuestionIds);
    const rendered = problems.map((p) => `${p.kind} in ${p.lesson}: ${p.detail}`);
    expect(rendered, `Lesson problems:\n${rendered.join("\n")}`).toEqual([]);
  });

  it("attaches every lesson to a real skill", () => {
    const orphans = allLessons.filter((l) => !validSkills.has(l.skillSlug)).map((l) => l.skillSlug);
    expect(orphans).toEqual([]);
  });

  it("never targets the same skill twice", () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const lesson of allLessons) {
      if (seen.has(lesson.skillSlug)) dupes.push(lesson.skillSlug);
      seen.add(lesson.skillSlug);
    }
    expect(dupes).toEqual([]);
  });

  it("gives every figure a text alternative", () => {
    // These are teaching materials. A graph with no description is unusable
    // with a screen reader and there is no way to recover the content.
    const missing: string[] = [];
    for (const lesson of allLessons) {
      lesson.blocks.forEach((block, i) => {
        if (block.type !== "graph" && block.type !== "diagram") return;
        const spec = block.spec as { description?: string } | null;
        if (!spec?.description?.trim()) missing.push(`${lesson.skillSlug} block[${i}]`);
      });
    }
    expect(missing).toEqual([]);
  });
});

describe("checkpoint questions cannot leak an answer key", () => {
  it("strips the answer from a question before it reaches a lesson page", () => {
    // The lesson page sends checkpoint questions through toClientSafe and gets
    // the worked solution back only from the grading server action. Anything
    // that reintroduces the answer here puts it in the page source.
    const question = {
      id: "q_test",
      examId: "e1",
      topicId: "t1",
      type: "single_mcq",
      stem: "What is $2+2$?",
      difficulty: "easy",
      points: 1,
      explanationSteps: ["Add two and two."],
      finalAnswer: "4",
      conceptSummary: "Addition.",
      distractorRationales: { "0": "Off by one." },
      status: "published",
      isFree: true,
      options: [
        { id: "o1", content: "3", isCorrect: false, orderIndex: 0 },
        { id: "o2", content: "4", isCorrect: true, orderIndex: 1 },
      ],
      numericAnswer: { correctValue: 4, tolerance: 0, acceptedExpressions: ["four"] },
    } as unknown as Question;

    const json = JSON.stringify(toClientSafe(question));

    for (const key of [
      "isCorrect",
      "finalAnswer",
      "explanationSteps",
      "conceptSummary",
      "distractorRationales",
      "numericAnswer",
      "correctValue",
      "acceptedExpressions",
    ]) {
      expect(json, `client payload contains "${key}"`).not.toContain(key);
    }
    expect(json).not.toContain("Add two and two.");
    expect(json).not.toContain("four");
    // What the student does need is still there.
    expect(json).toContain("What is $2+2$?");
  });
});
