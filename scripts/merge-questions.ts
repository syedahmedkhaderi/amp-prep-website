import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";

loadScriptsEnv();

import katex from "katex";
import { authoredQuestions, type AuthoredQuestion } from "../data/questions";
import { parseMathDelimiters } from "../lib/math/parse";

/**
 * Merge the hand-authored questions into data/generated/questions.json.
 *
 * Validated before anything is written, because the whole point of authoring
 * these by hand is that they are better than what the generator produced. A
 * batch that fails validation is rejected outright rather than partially
 * merged: a half-applied merge is harder to reason about than none.
 *
 * Idempotent. Re-running replaces the authored entries in place rather than
 * appending duplicates, so the file can be regenerated after an edit.
 *
 *   npx tsx scripts/merge-questions.ts            # validate only
 *   npx tsx scripts/merge-questions.ts --write
 */

const QUESTIONS_PATH = path.resolve(process.cwd(), "data/generated/questions.json");
const SKILLS_PATH = path.resolve(process.cwd(), "data/generated/skills.json");

function validate(questions: AuthoredQuestion[], existingIds: Set<string>): string[] {
  const problems: string[] = [];
  const skills = JSON.parse(fs.readFileSync(SKILLS_PATH, "utf-8")).skills as any[];
  const skillBySlug = new Map(skills.map((s) => [s.slug, s]));
  const seen = new Set<string>();

  for (const q of questions) {
    const fail = (msg: string) => problems.push(`${q.id}: ${msg}`);

    if (seen.has(q.id)) fail("duplicate id within the authored set");
    seen.add(q.id);
    // An id already in the bank would silently overwrite a generated question.
    if (existingIds.has(q.id)) fail("id already exists in the generated bank");

    const skill = skillBySlug.get(q.skillSlug);
    if (!skill) fail(`unknown skill ${q.skillSlug}`);
    else {
      if (skill.topicSlug !== q.topicSlug) fail(`skill belongs to ${skill.topicSlug}, not ${q.topicSlug}`);
      if (skill.exam !== q.exam) fail(`skill is ${skill.exam}, not ${q.exam}`);
    }

    if (q.options.length !== 4) fail(`has ${q.options.length} options, expected 4`);
    const correct = q.options.filter((o) => o.correct === true);
    if (correct.length !== 1) fail(`has ${correct.length} correct options, expected 1`);
    if (q.steps.length < 3) fail(`has ${q.steps.length} explanation steps, expected at least 3`);

    // Every wrong option needs a rationale, keyed by its index.
    q.options.forEach((o, i) => {
      if (o.correct) return;
      if (!q.distractors[String(i)]) fail(`option ${i} has no distractor rationale`);
    });

    if (!q.answer.trim()) fail("no answer text");
    if (!q.concept.trim()) fail("no concept summary");

    // Every math segment must render, or the student is shown raw source.
    const texts = [q.stem, q.answer, q.concept, ...q.steps, ...q.options.map((o) => o.content), ...Object.values(q.distractors)];
    for (const text of texts) {
      for (const part of parseMathDelimiters(text)) {
        if (part.type === "text") continue;
        try {
          katex.renderToString(part.content, { throwOnError: true, displayMode: part.type === "display" });
        } catch (err: any) {
          fail(`LaTeX does not render: ${String(err.message).slice(0, 80)}`);
        }
      }
      const dollars = (text.match(/(?<!\\)\$/g) || []).length;
      if (dollars % 2 !== 0) fail(`odd number of $ delimiters in "${text.slice(0, 40)}"`);
      if (/\*\*|\\\(|\\\)/.test(text)) fail("markdown or unsupported delimiter");
      if (/[πθ√²³≤≥≠±∞÷·∑]/.test(text)) fail("Unicode math where LaTeX belongs");
    }
  }
  return problems;
}

/** Convert to the shape the generated bank and scripts/seed.ts expect. */
function toBankShape(q: AuthoredQuestion) {
  return {
    id: q.id,
    exam: q.exam,
    topic_slug: q.topicSlug,
    skill_slug: q.skillSlug,
    type: "single_mcq",
    difficulty: q.difficulty,
    stem: q.stem,
    options: q.options.map((o) => ({ content: o.content, is_correct: o.correct === true })),
    final_answer: q.answer,
    explanation_steps: q.steps,
    distractor_rationales: q.distractors,
    concept_summary: q.concept,
    source: "authored",
  };
}

function main() {
  const write = process.argv.includes("--write");
  const raw = fs.readFileSync(QUESTIONS_PATH, "utf-8");
  const bank = JSON.parse(raw) as any[];

  const authoredIds = new Set(authoredQuestions.map((q) => q.id));
  const generated = bank.filter((q) => !authoredIds.has(q.id));
  const existingIds = new Set(generated.map((q) => q.id));

  const problems = validate(authoredQuestions, existingIds);

  console.log(`[merge] ${authoredQuestions.length} authored question(s)`);
  const byTopic = new Map<string, number>();
  for (const q of authoredQuestions) byTopic.set(q.topicSlug, (byTopic.get(q.topicSlug) ?? 0) + 1);
  for (const [slug, n] of [...byTopic.entries()].sort()) console.log(`  ${slug.padEnd(34)} ${n}`);

  if (problems.length > 0) {
    console.error(`\n[merge] ${problems.length} validation problem(s):`);
    for (const p of problems.slice(0, 25)) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log("[merge] All authored questions pass validation.");

  if (!write) {
    console.log("[merge] Validation only. Re-run with --write to merge.");
    return;
  }

  const merged = [...generated, ...authoredQuestions.map(toBankShape)];
  fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(merged, null, 2) + "\n");
  console.log(`[merge] Bank is now ${merged.length} questions. Run \`npm run seed && npm run assemble\`.`);
}

if (require.main === module) main();
