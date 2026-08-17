import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { allLessons } from "../data/lessons";

/**
 * Keep the notation uniform across lessons and the question bank.
 *
 * These defects all render, or half-render, rather than throwing, so nothing
 * else catches them: markdown bold shows literal asterisks, \(...\) shows the
 * backslashes, and a doubled backslash before a command produces a line break
 * and the word "frac" in italics. The bank shipped all three.
 *
 * Runs offline against the committed JSON, so it belongs in CI next to
 * tests/latex-render.test.ts.
 */

const QUESTIONS_PATH = path.resolve(__dirname, "../data/generated/questions.json");
const questions = JSON.parse(fs.readFileSync(QUESTIONS_PATH, "utf-8")) as any[];

/** Every student-visible string on a question. */
function questionText(q: any): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const push = (where: string, text: unknown) => {
    if (typeof text === "string" && text.length > 0) out.push({ where, text });
  };
  push("stem", q.stem);
  push("final_answer", q.final_answer);
  push("concept_summary", q.concept_summary);
  (q.options ?? []).forEach((o: any, i: number) => push(`option[${i}]`, o?.content));
  (q.explanation_steps ?? []).forEach((s: string, i: number) => push(`step[${i}]`, s));
  (q.match_choices ?? []).forEach((c: string, i: number) => push(`choice[${i}]`, c));
  (q.matches ?? []).forEach((m: any, i: number) => push(`match[${i}]`, m?.left_content));
  return out;
}

/** Every student-visible string in a lesson. */
function lessonText(lesson: (typeof allLessons)[number]): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const push = (where: string, text: unknown) => {
    if (typeof text === "string" && text.length > 0) out.push({ where, text });
  };
  push("title", lesson.title);
  push("summary", lesson.summary);
  lesson.blocks.forEach((b, i) => {
    if (b.type === "prose") push(`block[${i}]`, b.text);
    if (b.type === "callout") push(`block[${i}]`, b.text);
    if (b.type === "definition") {
      push(`block[${i}].term`, b.term);
      push(`block[${i}].meaning`, b.meaning);
    }
    if (b.type === "worked_example") {
      push(`block[${i}].prompt`, b.prompt);
      push(`block[${i}].answer`, b.answer);
      b.steps.forEach((s, j) => {
        push(`block[${i}].step[${j}].action`, s.action);
        push(`block[${i}].step[${j}].why`, s.why);
      });
    }
    if ((b.type === "graph" || b.type === "diagram") && b.caption) push(`block[${i}].caption`, b.caption);
  });
  return out;
}

const BAD_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "markdown bold", pattern: /\*\*[^*]+\*\*/ },
  { name: "\\( \\) delimiters", pattern: /\\\(|\\\)/ },
  { name: "doubled backslash before a command", pattern: /\\\\(frac|sqrt|cdot|times)/ },
  { name: "control character", pattern: /[\x00-\x08\x0b\x0c\x0e-\x1f]/ },
];

describe("notation is uniform across all content", () => {
  for (const { name, pattern } of BAD_PATTERNS) {
    it(`has no ${name} in the question bank`, () => {
      const hits = questions.flatMap((q) =>
        questionText(q)
          .filter(({ text }) => pattern.test(text))
          .map(({ where }) => `${q.id} ${where}`)
      );
      expect(hits.slice(0, 20), `${hits.length} occurrence(s)`).toEqual([]);
    });

    it(`has no ${name} in the lessons`, () => {
      const hits = allLessons.flatMap((l) =>
        lessonText(l)
          .filter(({ text }) => pattern.test(text))
          .map(({ where }) => `${l.skillSlug} ${where}`)
      );
      expect(hits.slice(0, 20), `${hits.length} occurrence(s)`).toEqual([]);
    });
  }

  it("keeps Unicode math out of the lessons", () => {
    // The bank has nine plain-text prose summaries using Unicode, which render
    // correctly and are left alone. New lesson content has no such excuse: it
    // is written as LaTeX throughout.
    const glyphs = /[πθ√²³⁴≤≥≠±∞÷·∑αβγδλμ]/;
    const hits = allLessons.flatMap((l) =>
      lessonText(l)
        .filter(({ text }) => glyphs.test(text))
        .map(({ where }) => `${l.skillSlug} ${where}`)
    );
    expect(hits).toEqual([]);
  });

  it("never loses a math delimiter in a served question", () => {
    // An odd number of $ is only a defect when LaTeX is present. "costs $48"
    // is currency and renders fine; "costs $48 and \frac{1}{2}" has lost one.
    const latex = /\\(frac|sqrt|cdot|times|div|pi|theta|le|ge|ne|pm|infty|log|ln|sin|cos|tan|circ|underline|text|left|right|begin|sum|approx)/;
    const hits = questions
      .filter((q) => q.status !== "needs_review")
      .flatMap((q) =>
        questionText(q)
          .filter(({ text }) => (text.match(/(?<!\\)\$/g) || []).length % 2 !== 0 && latex.test(text))
          .map(({ where }) => `${q.id} ${where}`)
      );
    expect(hits.slice(0, 20), `${hits.length} field(s) lost a delimiter`).toEqual([]);
  });
});

describe("coverage is complete", () => {
  it("has a lesson for every skill", () => {
    const skills = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../data/generated/skills.json"), "utf-8")
    ).skills as { slug: string }[];
    const covered = new Set(allLessons.map((l) => l.skillSlug));
    const missing = skills.filter((s) => !covered.has(s.slug)).map((s) => s.slug);
    expect(missing, `${missing.length} skill(s) without a lesson`).toEqual([]);
  });
});
