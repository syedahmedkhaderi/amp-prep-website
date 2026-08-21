import { loadScriptsEnv } from "./lib/env";

loadScriptsEnv();

import { allLessons } from "../data/lessons";
import type { LessonSource } from "../data/lessons/types";
import { renderPlot, type PlotSpec, type AnyPlotSpec } from "../lib/math/plot";
import { compileExpression } from "../lib/math/expression";
import { parseMathDelimiters } from "../lib/math/parse";
import katex from "katex";

/**
 * Gate the lesson content before it reaches the database.
 *
 * Entirely offline and deterministic, so it runs in CI next to the question
 * bank's LaTeX gate. A lesson that fails here would have shipped a broken graph
 * or unreadable prose to a student who is already struggling with the subject.
 *
 *   npx tsx scripts/verify-lessons.ts
 */

/** Words that signal writing aimed at someone who already understands. */
const BANNED_PHRASES = [
  "hence",
  "thus",
  "it follows that",
  "observe that",
  "clearly",
  "obviously",
  "trivially",
  "denote",
  "arbitrary",
  "straightforward",
  "simply note",
  "as we know",
  "recall that",
];

/** Terms the syllabus requires, which are long but cannot be avoided. */
const VOCABULARY_WHITELIST = new Set([
  "denominator",
  "numerator",
  "perpendicular",
  "parallel",
  "irrational",
  "rational",
  "logarithm",
  "logarithmic",
  "exponential",
  "coefficient",
  "polynomial",
  "quadratic",
  "hypotenuse",
  "pythagorean",
  "reciprocal",
  "asymptote",
  "symmetry",
  "trigonometric",
  "trigonometry",
  "equation",
  "expression",
  "inequality",
  "variable",
  "multiply",
  "multiplying",
  "multiplication",
  "dividing",
  "division",
  "subtracting",
  "subtraction",
  "calculation",
  "calculator",
  "horizontal",
  "vertical",
  "negative",
  "positive",
  "identical",
  "identically",
  "consistent",
  "difficult",
  "misleading",
  "understanding",
  "understood",
  "placement",
  "improper",
  "unavoidable",
]);

const MAX_SENTENCE_WORDS = 25;
const MAX_MEDIAN_GRADE = 9;

interface Problem {
  lesson: string;
  kind: string;
  detail: string;
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const groups = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

/**
 * Flesch-Kincaid grade level, with the math stripped out first.
 *
 * Scoring a string that still contains $\frac{x^{2}-4}{x+2}$ produces noise:
 * the formula counts characters as words and has no syllables to speak of. The
 * prose either side of the math is what a reader has to parse, so that is what
 * is measured.
 */
function gradeLevel(text: string): number | null {
  const proseOnly = parseMathDelimiters(text)
    .filter((p) => p.type === "text")
    .map((p) => p.content)
    .join(" ");
  const sentences = proseOnly.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = proseOnly.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  if (sentences.length === 0 || words.length < 10) return null;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  return 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59;
}

function proseBlocks(lesson: LessonSource): string[] {
  const out: string[] = [];
  for (const block of lesson.blocks) {
    if (block.type === "prose") out.push(block.text);
    if (block.type === "definition") out.push(block.meaning);
    if (block.type === "callout") out.push(block.text);
    if (block.type === "list") {
      if (block.intro) out.push(block.intro);
      out.push(...block.items);
    }
    if (block.type === "worked_example") {
      out.push(block.prompt);
      for (const step of block.steps) {
        out.push(step.action);
        out.push(step.why);
      }
    }
  }
  return out;
}

function allMathStrings(lesson: LessonSource): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  lesson.blocks.forEach((block, i) => {
    const push = (field: string, text?: string) => {
      if (text) out.push({ path: `block[${i}].${field}`, text });
    };
    if (block.type === "prose") push("text", block.text);
    if (block.type === "definition") {
      push("term", block.term);
      push("meaning", block.meaning);
    }
    if (block.type === "callout") push("text", block.text);
    if (block.type === "worked_example") {
      push("prompt", block.prompt);
      push("answer", block.answer);
      block.steps.forEach((s, j) => {
        push(`steps[${j}].action`, s.action);
        push(`steps[${j}].math`, s.math);
        push(`steps[${j}].why`, s.why);
      });
    }
    if (block.type === "graph" || block.type === "diagram") push("caption", block.caption);
    if (block.type === "table") {
      push("caption", block.caption);
      block.headers.forEach((h, c) => push(`header[${c}]`, h));
      block.rows.forEach((row, r) => row.forEach((cell, c) => push(`row[${r}][${c}]`, cell)));
    }
    if (block.type === "list") {
      push("intro", block.intro);
      block.items.forEach((item, j) => push(`item[${j}]`, item));
    }
  });
  return out;
}

export function verifyLessons(lessons: LessonSource[], validSkillSlugs: Set<string>, publishedQuestionIds: Set<string>): Problem[] {
  const problems: Problem[] = [];
  const seenSkills = new Set<string>();

  for (const lesson of lessons) {
    const id = lesson.skillSlug;
    const fail = (kind: string, detail: string) => problems.push({ lesson: id, kind, detail });

    if (!validSkillSlugs.has(lesson.skillSlug)) fail("unknown-skill", lesson.skillSlug);
    if (seenSkills.has(lesson.skillSlug)) fail("duplicate-skill", "two lessons target the same skill");
    seenSkills.add(lesson.skillSlug);

    // Every math segment must render, or the student sees raw LaTeX.
    for (const { path, text } of allMathStrings(lesson)) {
      for (const part of parseMathDelimiters(text)) {
        if (part.type === "text") continue;
        try {
          katex.renderToString(part.content, { throwOnError: true, displayMode: part.type === "display" });
        } catch (err: any) {
          fail("latex", `${path}: ${String(err.message).slice(0, 120)}`);
        }
      }
    }

    // Graph specs must parse and produce a drawable curve.
    // An interactive plot must parse with the same evaluator the static ones
    // use, and its sliders must actually drive parameters the expression
    // mentions. A slider for a letter the formula never uses does nothing and
    // reads as a broken control.
    lesson.blocks.forEach((block, i) => {
      if (block.type !== "interactive") return;
      const spec = block.spec as any;
      if (!spec?.description) fail("graph-alt-text", `block[${i}] interactive has no description`);
      if (!Array.isArray(spec?.sliders) || spec.sliders.length === 0) {
        fail("interactive", `block[${i}] has no sliders`);
        return;
      }
      const names = spec.sliders.map((sl: any) => sl.name);
      try {
        const compiled = compileExpression(spec.fn, { parameters: names });
        for (const name of names) {
          if (!compiled.variables.has(name)) {
            fail("interactive", `block[${i}] slider "${name}" is not used by ${spec.fn}`);
          }
        }
        // Evaluate at the initial settings so a spec that cannot produce a
        // curve is caught here rather than as a blank figure in the browser.
        const scope: Record<string, number> = { x: 1 };
        for (const sl of spec.sliders) scope[sl.name] = sl.initial;
        const y = compiled.evaluate(scope);
        if (!Number.isFinite(y)) fail("interactive", `block[${i}] is undefined at its initial slider values`);
      } catch (err: any) {
        fail("interactive", `block[${i}] ${spec.fn}: ${String(err.message).slice(0, 80)}`);
      }
    });

    lesson.blocks.forEach((block, i) => {
      if (block.type !== "graph") return;
      const spec = block.spec as AnyPlotSpec;
      if (!spec || typeof spec !== "object" || !("kind" in spec)) {
        fail("graph", `block[${i}] has no kind`);
        return;
      }
      if (!spec.description) fail("graph-alt-text", `block[${i}] has no description`);
      if (spec.kind === "cartesian") {
        const geometry = renderPlot(spec as PlotSpec);
        for (const warning of geometry.warnings) fail("graph", `block[${i}]: ${warning}`);
        const curves = (spec as PlotSpec).curves ?? [];
        if (curves.length > 0 && geometry.polylines.length === 0) {
          fail("graph", `block[${i}] declares curves but draws nothing`);
        }
      }
    });

    lesson.blocks.forEach((block, i) => {
      if (block.type === "diagram") {
        const spec = block.spec as { description?: string };
        if (!spec?.description) fail("diagram-alt-text", `block[${i}] has no description`);
      }
    });

    // A table whose rows do not match its headers renders as a broken grid, so
    // it is a hard failure rather than something to notice in review.
    lesson.blocks.forEach((block, i) => {
      if (block.type !== "table") return;
      if (block.headers.length < 2) fail("table", `block[${i}] needs at least two columns`);
      if (block.rows.length === 0) fail("table", `block[${i}] has no rows`);
      block.rows.forEach((row, r) => {
        if (row.length !== block.headers.length) {
          fail(
            "table",
            `block[${i}] row ${r} has ${row.length} cells but there are ${block.headers.length} headers`
          );
        }
      });
    });

    lesson.blocks.forEach((block, i) => {
      if (block.type !== "list") return;
      if (block.items.length < 2) fail("list", `block[${i}] needs at least two items`);
    });

    // Checkpoints must point at questions a student can actually be served.
    for (const block of lesson.blocks) {
      if (block.type !== "checkpoint") continue;
      if (block.questionIds.length === 0) fail("checkpoint", "no questions");
      for (const qid of block.questionIds) {
        if (!publishedQuestionIds.has(qid)) fail("checkpoint", `${qid} is not a published question`);
      }
    }

    // Shape: a lesson without an example or a check is a wall of text.
    if (!lesson.blocks.some((b) => b.type === "worked_example")) fail("shape", "no worked example");
    if (!lesson.blocks.some((b) => b.type === "checkpoint")) fail("shape", "no checkpoint");
    if (!lesson.title.trim() || !lesson.summary.trim()) fail("shape", "missing title or summary");

    // Readability. Banned phrases and long sentences are hard failures because
    // they are unambiguous. Grade level is a warning on the median block: any
    // single paragraph can score high on required vocabulary alone.
    const blocks = proseBlocks(lesson);
    for (const text of blocks) {
      const lower = text.toLowerCase();
      for (const phrase of BANNED_PHRASES) {
        if (new RegExp(`\\b${phrase}\\b`).test(lower)) fail("banned-phrase", `"${phrase}"`);
      }
      const proseOnly = parseMathDelimiters(text)
        .filter((p) => p.type === "text")
        .map((p) => p.content)
        .join(" ");
      for (const sentence of proseOnly.split(/[.!?]+/)) {
        const words = sentence.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
        if (words.length > MAX_SENTENCE_WORDS) {
          fail("long-sentence", `${words.length} words: "${sentence.trim().slice(0, 60)}..."`);
        }
      }
    }

    const grades = blocks.map(gradeLevel).filter((g): g is number => g !== null).sort((a, b) => a - b);
    if (grades.length > 0) {
      const median = grades[Math.floor(grades.length / 2)];
      if (median > MAX_MEDIAN_GRADE) {
        fail("readability", `median grade level ${median.toFixed(1)} exceeds ${MAX_MEDIAN_GRADE}`);
      }
    }
  }

  return problems;
}

// Mirrors scripts/seed.ts's heldForReview(), which decides at seed time
// whether a question is actually served to students. Duplicated rather than
// imported: seed.ts runs a destructive seed() call at module load with no
// require.main guard, so importing it would reseed the real database as a
// side effect of running this offline content gate. Keep this in sync with
// seed.ts if that logic ever changes.
const SELF_CORRECTION =
  /\bWait\b|\bwait,|Re-evaluating|Recalculating|Correction:|let me recheck|I made an error/i;
const PLAIN_NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

function isPublished(q: any): boolean {
  if (q.status === "needs_review" || q.status === "retired") return false;
  const prose = [...(q.explanation_steps || []), q.concept_summary || ""].join(" ");
  if (SELF_CORRECTION.test(prose)) return false;
  const na = q.numeric_answer;
  if (
    q.type === "numeric" &&
    na &&
    na.value === 0 &&
    (na.accepted || []).some((a: any) => !PLAIN_NUMBER.test(String(a).trim()))
  ) {
    return false;
  }
  return true;
}

async function main() {
  const fs = await import("fs");
  const path = await import("path");

  const skillsFile = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), "data/generated/skills.json"), "utf-8")
  );
  const validSkills = new Set<string>(skillsFile.skills.map((s: any) => s.slug));

  const questionsFile = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), "data/generated/questions.json"), "utf-8")
  );
  const published = new Set<string>(
    questionsFile.filter(isPublished).map((q: any) => q.id)
  );

  const problems = verifyLessons(allLessons, validSkills, published);

  console.log(`[verify-lessons] ${allLessons.length} lesson(s) checked`);
  if (problems.length === 0) {
    console.log("[verify-lessons] All clear.");
    return;
  }
  const byKind = new Map<string, Problem[]>();
  for (const p of problems) {
    const bucket = byKind.get(p.kind);
    if (bucket) bucket.push(p);
    else byKind.set(p.kind, [p]);
  }
  for (const [kind, items] of byKind) {
    console.log(`\n[verify-lessons] ${kind} (${items.length})`);
    for (const item of items.slice(0, 12)) console.log(`  ${item.lesson}: ${item.detail}`);
  }
  console.log(`\n[verify-lessons] ${problems.length} problem(s).`);
  process.exit(1);
}

if (require.main === module) main();
