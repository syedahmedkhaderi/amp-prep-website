import { describe, it, expect } from "vitest";
import { authoredQuestions } from "@/data/questions";

/**
 * Quality gates for hand-authored questions.
 *
 * scripts/merge-questions.ts already checks structure — four options, one
 * correct, a rationale per wrong option, a real skill slug. These check the
 * writing, which is the part that made the generated bank hard to read: hedging
 * phrases, sentences too long for the audience, and steps that restate the
 * question instead of advancing it.
 */

/** Phrases that assume the reader already knows, which this audience does not. */
const BANNED =
  /\.\.\.|\bhence\b|\bthus\b|\bit follows that\b|\bobserve that\b|\bclearly\b|\bobviously\b|\btrivially\b|\bdenote\b|\barbitrary\b/i;

const MAX_WORDS = 28;

function fieldsOf(q: (typeof authoredQuestions)[number]): [string, string][] {
  const out: [string, string][] = [
    ["stem", q.stem],
    ["answer", q.answer],
    ["concept", q.concept],
  ];
  q.steps.forEach((s, i) => out.push([`step[${i}]`, s]));
  q.options.forEach((o, i) => out.push([`option[${i}]`, o.content]));
  Object.entries(q.distractors).forEach(([k, v]) => out.push([`distractor[${k}]`, v]));
  return out;
}

/**
 * Count words with maths collapsed to one token, so a fraction is not five,
 * and with markdown table rows dropped. A data table the student reads off is
 * not a sentence, and counting its cells as words fails a question for being
 * clear rather than for being long-winded.
 */
function wordCount(text: string): number {
  return text
    .split("\n")
    .filter((line) => !line.trim().startsWith("|"))
    .join(" ")
    .replace(/\$[^$]*\$/g, "M")
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Strip the formatting that separates how an answer is written in prose from
 * how the same answer is written as an option, so the two can be compared.
 */
function collapse(text: string): string {
  return text
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\left|\\right|\\[,;!]/g, "")
    .replace(/[$\s]/g, "")
    .toLowerCase();
}

describe("authored question quality", () => {
  it("has questions to check", () => {
    expect(authoredQuestions.length).toBeGreaterThan(0);
  });

  it("uses no hedging or gatekeeping phrases", () => {
    const found: string[] = [];
    for (const q of authoredQuestions) {
      for (const [name, text] of fieldsOf(q)) {
        if (BANNED.test(text)) found.push(`${q.id} ${name}: ${text.slice(0, 80)}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("keeps every sentence under the word cap", () => {
    const found: string[] = [];
    for (const q of authoredQuestions) {
      for (const [name, text] of fieldsOf(q)) {
        for (const sentence of text.split(/(?<=[.?!])\s+/)) {
          const n = wordCount(sentence);
          if (n > MAX_WORDS) found.push(`${q.id} ${name} (${n} words)`);
        }
      }
    }
    expect(found).toEqual([]);
  });

  it("gives at least three real steps per question", () => {
    const found = authoredQuestions.filter((q) => q.steps.length < 3).map((q) => q.id);
    expect(found).toEqual([]);
  });

  it("explains every wrong option and marks exactly one right", () => {
    const found: string[] = [];
    for (const q of authoredQuestions) {
      if (q.options.length !== 4) found.push(`${q.id} has ${q.options.length} options`);
      const correct = q.options.filter((o) => o.correct).length;
      if (correct !== 1) found.push(`${q.id} marks ${correct} options correct`);
      if (Object.keys(q.distractors).length !== 3) {
        found.push(`${q.id} has ${Object.keys(q.distractors).length} rationales`);
      }
    }
    expect(found).toEqual([]);
  });

  it("uses a unique id for every question", () => {
    const seen = new Map<string, number>();
    for (const q of authoredQuestions) seen.set(q.id, (seen.get(q.id) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1).map(([id]) => id)).toEqual([]);
  });

  it("never repeats an exact stem", () => {
    // Re-skinning one question with new numbers is the failure the generated
    // bank had 143 times over. An identical stem is the clearest form of it.
    const seen = new Map<string, string[]>();
    for (const q of authoredQuestions) {
      const key = q.stem.trim().toLowerCase();
      seen.set(key, [...(seen.get(key) ?? []), q.id]);
    }
    expect([...seen.values()].filter((ids) => ids.length > 1)).toEqual([]);
  });
  it("states an answer that matches the option marked correct", () => {
    // The structural gate in merge-questions.ts checks that exactly one option
    // carries `correct`. It cannot tell whether that is the *right* one. This
    // catches the mechanical slip behind every wrong key found in the generated
    // bank: the steps derive one value and the tick lands on another.
    const mismatched: string[] = [];
    for (const q of authoredQuestions) {
      const correct = q.options.find((o) => o.correct);
      if (!correct) continue;
      const answer = collapse(q.answer);
      const option = collapse(correct.content);
      if (!answer.includes(option) && !option.includes(answer)) {
        mismatched.push(`${q.id}: answer "${q.answer}" vs option "${correct.content}"`);
      }
    }
    expect(mismatched).toEqual([]);
  });
});
