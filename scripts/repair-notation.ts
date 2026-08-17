import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";

loadScriptsEnv();

/**
 * Bring the question bank's notation into line with the lessons.
 *
 * The bank and the lessons were written by different processes, and the bank
 * carries notation the lessons never use: markdown bold that renders as
 * literal asterisks, Unicode glyphs where a LaTeX command belongs, and
 * delimiters KaTeX does not understand. All of it displays badly next to a
 * lesson that does the same thing properly.
 *
 * Two classes of problem, handled differently:
 *
 * Mechanical, so repaired in place: markdown bold, Unicode math glyphs,
 * \(...\) delimiters, a literal double backslash before a command, and an
 * escaped \$ sitting immediately before a LaTeX command.
 *
 * Ambiguous, so quarantined instead: a field with an odd number of $ AND real
 * LaTeX in it has lost a delimiter somewhere, and there is no safe way to
 * guess where it went. Some are a missing opening $, some are a currency $
 * that has captured a following math segment. Guessing would produce
 * confidently wrong output, so these go to needs_review and out of the
 * student-facing pool until a human looks at them.
 *
 *   npx tsx scripts/repair-notation.ts            # report only
 *   npx tsx scripts/repair-notation.ts --write
 */

const QUESTIONS_PATH = path.resolve(process.cwd(), "data/generated/questions.json");

const LATEX_COMMAND = /\\(frac|sqrt|cdot|times|div|pi|theta|le|ge|ne|pm|infty|log|ln|sin|cos|tan|circ|underline|text|left|right|begin|sum|approx)/;

interface Stats {
  markdown: number;
  parenDelims: number;
  doubleBackslash: number;
  escapedDollar: number;
  quarantined: string[];
}

/** Repair one string. Returns the new value, or null if unchanged. */
function repairText(text: string, stats: Stats): string | null {
  let out = text;
  const before = out;

  // Markdown bold never renders. Strip the markers, keep the words.
  if (/\*\*[^*]+\*\*/.test(out)) {
    out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
    stats.markdown++;
  }

  // \(...\) is not a delimiter the parser knows. Convert to $...$.
  if (/\\\(|\\\)/.test(out)) {
    out = out.replace(/\\\(/g, "$").replace(/\\\)/g, "$");
    stats.parenDelims++;
  }

  // A literal double backslash before a command renders as a line break
  // followed by the command name in italics.
  if (/\\\\(frac|sqrt|cdot|times)/.test(out)) {
    out = out.replace(/\\\\(frac|sqrt|cdot|times)/g, "\\$1");
    stats.doubleBackslash++;
  }

  // An escaped dollar immediately before a command was meant to open math.
  if (/\\\$(?=\s*\\[a-zA-Z])/.test(out)) {
    out = out.replace(/\\\$(?=\s*\\[a-zA-Z])/g, "$");
    stats.escapedDollar++;
  }

  // Unicode glyphs are deliberately NOT converted.
  //
  // The nine affected fields are plain-text prose summaries such as
  // "T = 2pi*sqrt(L+x)/g matches ...", written without any LaTeX at all. In a
  // browser the Unicode renders correctly and the field is internally
  // consistent. A partial conversion is strictly worse: replacing the pi but
  // not the radical leaves "$\\pi$" sitting next to a bare Unicode root, which
  // is the stale-notation mix this script exists to remove. Converting them
  // properly means rewriting each summary as LaTeX, which is authoring work,
  // not a mechanical repair. scripts/audit-content.ts still reports them.

  return out === before ? null : out;
}

function main() {
  const write = process.argv.includes("--write");
  const raw = fs.readFileSync(QUESTIONS_PATH, "utf-8");
  const questions = JSON.parse(raw) as any[];

  const stats: Stats = { markdown: 0, parenDelims: 0, doubleBackslash: 0, escapedDollar: 0, quarantined: [] };

  for (const q of questions) {
    const apply = (get: () => string | undefined, set: (v: string) => void) => {
      const value = get();
      if (typeof value !== "string") return;
      const fixed = repairText(value, stats);
      if (fixed !== null) set(fixed);
    };

    apply(() => q.stem, (v) => (q.stem = v));
    apply(() => q.final_answer, (v) => (q.final_answer = v));
    apply(() => q.concept_summary, (v) => (q.concept_summary = v));
    (q.options ?? []).forEach((o: any) => {
      if (o) apply(() => o.content, (v) => (o.content = v));
    });
    (q.explanation_steps ?? []).forEach((_: string, i: number) => {
      apply(() => q.explanation_steps[i], (v) => (q.explanation_steps[i] = v));
    });
    (q.match_choices ?? []).forEach((_: string, i: number) => {
      apply(() => q.match_choices[i], (v) => (q.match_choices[i] = v));
    });
    (q.matches ?? []).forEach((m: any) => {
      if (m) apply(() => m.left_content, (v) => (m.left_content = v));
    });

    // After repair, check for a lost delimiter. Only fields that also contain
    // real LaTeX are a problem; an odd $ in "costs $48" is just currency.
    const fields: string[] = [
      q.stem,
      q.final_answer,
      ...(q.explanation_steps ?? []),
      ...(q.options ?? []).map((o: any) => o?.content),
      ...(q.match_choices ?? []),
    ].filter((f): f is string => typeof f === "string");

    const damaged = fields.some((f) => {
      const dollars = (f.match(/(?<!\\)\$/g) || []).length;
      return dollars % 2 !== 0 && LATEX_COMMAND.test(f);
    });
    if (damaged) {
      q.status = "needs_review";
      stats.quarantined.push(q.id);
    }
  }

  console.log(`[notation] ${questions.length} questions scanned`);
  console.log(`[notation] markdown bold stripped:     ${stats.markdown} field(s)`);
  console.log(`[notation] \\(...\\) delimiters fixed:   ${stats.parenDelims} field(s)`);
  console.log(`[notation] double backslash fixed:     ${stats.doubleBackslash} field(s)`);
  console.log(`[notation] escaped \\$ before command:  ${stats.escapedDollar} field(s)`);
  console.log(`[notation] quarantined (lost a $):     ${stats.quarantined.length} question(s)`);
  for (const id of stats.quarantined.slice(0, 10)) console.log(`  ${id}`);
  if (stats.quarantined.length > 10) console.log(`  ...and ${stats.quarantined.length - 10} more`);

  if (!write) {
    console.log("[notation] Report only. Re-run with --write to apply.");
    return;
  }

  const snapshot = `${QUESTIONS_PATH}.pre-notation-backup`;
  if (!fs.existsSync(snapshot)) fs.writeFileSync(snapshot, raw);
  fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(questions, null, 2) + "\n");
  console.log("[notation] Written. Run `npm run seed && npm run assemble` to rebuild.");
}

if (require.main === module) main();
