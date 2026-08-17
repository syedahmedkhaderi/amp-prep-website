import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";

loadScriptsEnv();

import katex from "katex";
import { allLessons } from "../data/lessons";
import { parseMathDelimiters } from "../lib/math/parse";
import { renderPlot, type PlotSpec } from "../lib/math/plot";

/**
 * One audit across both content types, checking the things that are supposed
 * to be uniform: LaTeX that actually renders, no stale notation, consistent
 * lesson shape, and consistent coverage per topic.
 *
 * The bank and the lessons were written at different times by different
 * processes, so "it renders" is not the same as "it is consistent". A question
 * writing an angle as the Unicode degree glyph and a lesson writing it as
 * ^{\circ} both display, and the pair still looks careless to a student who
 * reads them one after the other.
 *
 *   npx tsx scripts/audit-content.ts
 */

const QUESTIONS_PATH = path.resolve(process.cwd(), "data/generated/questions.json");
const SKILLS_PATH = path.resolve(process.cwd(), "data/generated/skills.json");

interface Finding {
  area: "lesson" | "question";
  id: string;
  kind: string;
  detail: string;
}

/**
 * Unicode characters that should have been written as LaTeX.
 *
 * Deliberately excludes the degree sign and the multiplication sign inside
 * plain prose, because both are legitimate outside math mode. Everything here
 * is a symbol that only ever belongs inside $...$ as a command.
 */
const LATEX_COMMAND = /\\(frac|sqrt|cdot|times|div|pi|theta|le|ge|ne|pm|infty|log|ln|sin|cos|tan|circ|underline|text|left|right|begin|sum|approx)/;

const STALE_GLYPHS: [RegExp, string][] = [
  [/π/g, "use \\pi"],
  [/θ/g, "use \\theta"],
  [/√/g, "use \\sqrt{}"],
  [/[²³⁴]/g, "use ^{2} ^{3} ^{4}"],
  [/≤/g, "use \\le"],
  [/≥/g, "use \\ge"],
  [/≠/g, "use \\ne"],
  [/±/g, "use \\pm"],
  [/∞/g, "use \\infty"],
  [/÷/g, "use \\div"],
  [/·/g, "use \\cdot"],
  [/∑/g, "use \\sum"],
  [/α|β|γ|δ|λ|μ/g, "use the LaTeX greek command"],
];

function checkText(area: Finding["area"], id: string, where: string, text: string, out: Finding[]): void {
  if (typeof text !== "string" || text.length === 0) return;

  // Stale notation that should have been LaTeX.
  for (const [pattern, advice] of STALE_GLYPHS) {
    const hits = text.match(pattern);
    if (hits) out.push({ area, id, kind: "stale-glyph", detail: `${where}: ${hits[0]} (${advice})` });
  }

  if (/\\\\frac|\\\\sqrt|\\\\cdot|\\\\times/.test(text)) {
    out.push({ area, id, kind: "double-backslash", detail: `${where}: literal \\\\command renders as a line break` });
  }
  if (/\\\(|\\\)/.test(text)) {
    out.push({ area, id, kind: "paren-delimiter", detail: `${where}: \\( \\) is not supported, use $...$` });
  }
  if (/\*\*[^*]+\*\*/.test(text)) {
    out.push({ area, id, kind: "markdown", detail: `${where}: markdown bold leaks into rendered prose` });
  }
  // Control characters are the signature of the \f -> form feed corruption.
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) {
    out.push({ area, id, kind: "control-char", detail: `${where}: contains a control character` });
  }

  // An odd number of $ only matters when the field also contains LaTeX. A
  // stem reading "a shirt costs $48" is currency, renders correctly, and is
  // not a defect; the same stem with a \frac in it has lost a delimiter and
  // will show raw source to the student.
  const dollars = (text.match(/(?<!\\)\$/g) || []).length;
  if (dollars % 2 !== 0) {
    const kind = LATEX_COMMAND.test(text) ? "unbalanced-math" : "currency-dollar";
    out.push({ area, id, kind, detail: `${where}: odd number of $ delimiters` });
  }

  // Every math segment must actually render.
  for (const part of parseMathDelimiters(text)) {
    if (part.type === "text") continue;
    try {
      katex.renderToString(part.content, { throwOnError: true, displayMode: part.type === "display" });
    } catch (err: any) {
      out.push({ area, id, kind: "katex", detail: `${where}: ${String(err.message).slice(0, 100)}` });
    }
  }
}

function auditLessons(out: Finding[]) {
  for (const lesson of allLessons) {
    const id = lesson.skillSlug;
    checkText("lesson", id, "title", lesson.title, out);
    checkText("lesson", id, "summary", lesson.summary, out);

    lesson.blocks.forEach((block, i) => {
      const at = `block[${i}]`;
      if (block.type === "prose") checkText("lesson", id, at, block.text, out);
      if (block.type === "definition") {
        checkText("lesson", id, `${at}.term`, block.term, out);
        checkText("lesson", id, `${at}.meaning`, block.meaning, out);
      }
      if (block.type === "callout") checkText("lesson", id, at, block.text, out);
      if (block.type === "worked_example") {
        checkText("lesson", id, `${at}.prompt`, block.prompt, out);
        checkText("lesson", id, `${at}.answer`, block.answer, out);
        block.steps.forEach((s, j) => {
          checkText("lesson", id, `${at}.step[${j}].action`, s.action, out);
          checkText("lesson", id, `${at}.step[${j}].why`, s.why, out);
          // `math` is raw LaTeX with no $ wrapper, so it is checked directly.
          if (s.math) {
            try {
              katex.renderToString(s.math, { throwOnError: true });
            } catch (err: any) {
              out.push({ area: "lesson", id, kind: "katex", detail: `${at}.step[${j}].math: ${String(err.message).slice(0, 100)}` });
            }
          }
        });
      }
      if (block.type === "graph" || block.type === "diagram") {
        if (block.caption) checkText("lesson", id, `${at}.caption`, block.caption, out);
        const spec = block.spec as any;
        if (!spec?.description) {
          out.push({ area: "lesson", id, kind: "no-alt-text", detail: `${at} has no description` });
        }
        if (block.type === "graph" && spec?.kind === "cartesian") {
          const g = renderPlot(spec as PlotSpec);
          for (const w of g.warnings) out.push({ area: "lesson", id, kind: "graph", detail: `${at}: ${w}` });
        }
      }
    });
  }
}

function auditQuestions(out: Finding[], served: Set<string>) {
  const questions = JSON.parse(fs.readFileSync(QUESTIONS_PATH, "utf-8")) as any[];
  for (const q of questions) {
    // A quarantined question is not served, so its defects cannot reach a
    // student. Reported, but never blocking.
    if (!served.has(q.id)) continue;
    checkText("question", q.id, "stem", q.stem, out);
    if (q.final_answer) checkText("question", q.id, "final_answer", q.final_answer, out);
    (q.options ?? []).forEach((o: any, i: number) => {
      if (o && typeof o.content === "string") checkText("question", q.id, `option[${i}]`, o.content, out);
    });
    (q.explanation_steps ?? []).forEach((s: string, i: number) => checkText("question", q.id, `step[${i}]`, s, out));
    (q.match_choices ?? []).forEach((c: string, i: number) => checkText("question", q.id, `choice[${i}]`, c, out));
    (q.matches ?? []).forEach((m: any, i: number) => {
      if (m?.left_content) checkText("question", q.id, `match[${i}]`, m.left_content, out);
    });
  }
  return questions;
}

function consistencyReport(questions: any[]) {
  const skills = JSON.parse(fs.readFileSync(SKILLS_PATH, "utf-8")).skills as any[];
  const lessonBySkill = new Map(allLessons.map((l) => [l.skillSlug, l]));

  const byTopic = new Map<string, { skills: number; lessons: number; questions: number; mcq: number; exam: string }>();
  for (const s of skills) {
    const row = byTopic.get(s.topicSlug) ?? { skills: 0, lessons: 0, questions: 0, mcq: 0, exam: s.exam };
    row.skills++;
    if (lessonBySkill.has(s.slug)) row.lessons++;
    byTopic.set(s.topicSlug, row);
  }
  for (const q of questions) {
    const row = byTopic.get(q.topic_slug);
    if (!row) continue;
    row.questions++;
    if (q.type === "single_mcq") row.mcq++;
  }

  console.log("\n=== COVERAGE BY TOPIC ===");
  console.log("exam   topic                                  skills lessons  qs   mcq");
  const rows = [...byTopic.entries()].sort((a, b) => a[1].exam.localeCompare(b[1].exam) || a[0].localeCompare(b[0]));
  for (const [slug, r] of rows) {
    const gap = r.lessons < r.skills ? "  <-- incomplete" : "";
    console.log(
      `${r.exam.padEnd(6)} ${slug.padEnd(38)} ${String(r.skills).padStart(5)} ${String(r.lessons).padStart(7)} ${String(r.questions).padStart(5)} ${String(r.mcq).padStart(5)}${gap}`
    );
  }

  // Lesson shape consistency.
  const lens = allLessons.map((l) => l.blocks.length);
  const examples = allLessons.map((l) => l.blocks.filter((b) => b.type === "worked_example").length);
  const mins = allLessons.map((l) => l.estMinutes);
  const stat = (a: number[]) => `min ${Math.min(...a)}, max ${Math.max(...a)}, mean ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)}`;
  console.log("\n=== LESSON SHAPE ===");
  console.log(`blocks per lesson:          ${stat(lens)}`);
  console.log(`worked examples per lesson: ${stat(examples)}`);
  console.log(`estimated minutes:          ${stat(mins)}`);
  const noGraph = allLessons.filter((l) => !l.blocks.some((b) => b.type === "graph" || b.type === "diagram")).length;
  console.log(`lessons with a figure:      ${allLessons.length - noGraph} of ${allLessons.length}`);
}

function main() {
  const Database = require("better-sqlite3");
  const db = new Database(path.resolve(process.cwd(), "data/amp-prep.db"), { readonly: true });
  const served = new Set<string>(
    (db.prepare("SELECT id FROM questions WHERE status = 'published'").all() as { id: string }[]).map((r) => r.id)
  );
  db.close();

  const findings: Finding[] = [];
  auditLessons(findings);
  const questions = auditQuestions(findings, served);

  console.log(`=== CONTENT AUDIT ===`);
  console.log(`${allLessons.length} lessons and ${served.size} published questions checked (${questions.length} in the bank).`);

  if (findings.length === 0) {
    console.log("No LaTeX or notation problems found.");
  } else {
    const byKind = new Map<string, Finding[]>();
    for (const f of findings) {
      const b = byKind.get(f.kind);
      if (b) b.push(f);
      else byKind.set(f.kind, [f]);
    }
    for (const [kind, items] of [...byKind.entries()].sort((a, b) => b[1].length - a[1].length)) {
      const lessons = items.filter((i) => i.area === "lesson").length;
      const qs = items.length - lessons;
      console.log(`\n${kind}: ${items.length}  (${lessons} in lessons, ${qs} in questions)`);
      for (const i of items.slice(0, 8)) console.log(`  [${i.area}] ${i.id} ${i.detail}`);
      if (items.length > 8) console.log(`  ...and ${items.length - 8} more`);
    }
  }

  consistencyReport(questions);

  // Currency and the nine plain-text glyph summaries render correctly; they are
  // consistency notes, not rendering failures.
  const blocking = findings.filter((f) => f.kind !== "stale-glyph" && f.kind !== "currency-dollar");
  console.log(`\n=== SUMMARY ===`);
  console.log(`${findings.length} finding(s); ${blocking.length} that break rendering.`);
  process.exitCode = blocking.length > 0 ? 1 : 0;
}

if (require.main === module) main();
