/**
 * Wrap bare LaTeX in $...$ so it renders instead of printing as source.
 *
 * 243 published questions carry LaTeX commands in fields that have no math
 * delimiters at all, so a student reads `1.25 \times 10^{2}` rather than the
 * typeset product. The generator emitted them that way; MathText is working
 * correctly, there is simply nothing telling it where the maths starts.
 *
 * The repair is deliberately narrow. A field like
 *
 *   "1: 0.025, 2: -0.04, 3: 4.5 \times 10^{-4}, 4: 0.785"
 *
 * is a prose list with one maths item in it, so wrapping the whole string would
 * push the labels into maths and break them. Instead this finds the maximal run
 * of maths-shaped tokens that contains at least one real LaTeX command and
 * wraps only that. Commas and prose words end a run.
 *
 * Text already inside $...$ is never touched: the field is split on delimiters
 * first and only the text segments are considered.
 *
 * Operates on data/generated/questions.json, which is what seed.ts reads. An
 * earlier version wrote straight to the SQLite file; that repair vanished on the
 * next `npm run seed`, because the bank is the source of truth and the database
 * is a projection of it.
 *
 * Usage:
 *   npx tsx scripts/repair-latex-delimiters.ts          # dry run, prints diffs
 *   npx tsx scripts/repair-latex-delimiters.ts --write  # apply
 */

import fs from "node:fs";
import path from "node:path";
import { findRenderFailures } from "../lib/math/render-check";


const BANK_PATH = path.resolve(process.cwd(), "data/generated/questions.json");
const WRITE = process.argv.includes("--write");

/**
 * Commands that only affect layout. They are legal LaTeX but carry no maths, so
 * a run made only of these is a formatting artefact rather than an expression:
 * wrapping `\newline\newline` in $...$ would hand KaTeX something it rejects.
 */
const LAYOUT_ONLY = /^(?:\\(?:newline|\\|par|noindent|smallskip|medskip|bigskip|hfill|break)\s*)+$/;

/** A backslash command, or a brace-group exponent/subscript. */
const HAS_LATEX = /\\[a-zA-Z]+|\^\{|_\{/;

/**
 * One maths token.
 *
 * Single letters are deliberately NOT tokens. An earlier version allowed them
 * and turned "the set of \underline{\quad} numbers" into "the set o$f
 * \underline{\quad}$ numbers", because the `f` of "of" is a plausible variable.
 * Prose is full of one-letter words, so a run may only be anchored by a real
 * LaTeX command.
 */

/**
 * A brace group, allowing one level of nesting. `\frac{A - 2\pi r^{2}}{2\pi r}`
 * is common in this bank and a flat `\{[^{}]*\}` cannot match its first
 * argument, so those expressions were being skipped entirely.
 */
const BRACES = String.raw`\{(?:[^{}]|\{[^{}]*\})*\}`;

/**
 * Algebra glued together without spaces, such as `2x^{6}y^{-2}`. Variables here
 * are safe even though bare single letters are not, because the run has to
 * contain a superscript or subscript to match at all — no prose word does.
 */
const GLUED = String.raw`(?:[A-Za-z0-9]+(?:[\^_]${BRACES}|[\^_]-?\d+))+[A-Za-z0-9]*`;

const TOKEN = String.raw`(?:${GLUED}|\\[a-zA-Z]+(?:\s*${BRACES})*|[\^_]${BRACES}|\^-?\d+|_\d|\d+(?:\.\d+)?|[-+*/=<>])`;

/**
 * Scan the whole string in one pass, alternating between existing $...$ spans,
 * which pass through untouched, and candidate bare runs.
 *
 * Reconstructing the string from parseMathDelimiters was tried first and is not
 * safe: the parser is lossy about which delimiter style a segment came from, so
 * round-tripping turned some `$x$` into `$$x$$`.
 */
const SCAN = new RegExp(
  String.raw`(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)` + // group 1: leave alone
    "|" +
    String.raw`(${TOKEN}(?:\s*${TOKEN})*)`, // group 2: candidate run
  "g"
);

/** Trailing punctuation and operators belong to the sentence, not the maths. */
function trimRun(run: string): string {
  return run.replace(/[\s.+\-*/=<>]+$/, "").trim();
}

/**
 * Wrap, then verify. If the rewritten string does not render cleanly in KaTeX
 * the original is kept: an unrendered `\times` is ugly, but a hard parse error
 * mid-exam is worse, and this repair is not worth trading one for the other.
 */
export function wrapBareLatex(text: string): string {
  const next = wrapUnchecked(text);
  if (next === text) return text;
  return findRenderFailures(next).length === 0 ? next : text;
}

function wrapUnchecked(text: string): string {
  if (!HAS_LATEX.test(text)) return text;

  return text.replace(SCAN, (whole, existing: string | undefined, run: string | undefined) => {
    if (existing !== undefined) return existing;
    if (run === undefined || !HAS_LATEX.test(run)) return whole;

    const trimmed = trimRun(run);
    if (!trimmed || !HAS_LATEX.test(trimmed)) return whole;
    if (LAYOUT_ONLY.test(trimmed)) return whole;

    // Anything the trim removed is re-attached outside the maths.
    return `$${trimmed}$${run.slice(trimmed.length)}`;
  });
}

function main() {
  const raw = fs.readFileSync(BANK_PATH, "utf-8");
  const bank = JSON.parse(raw) as Record<string, unknown>[];

  let changedQuestions = 0;
  let changedFields = 0;
  const samples: string[] = [];

  const note = (id: string, field: string, before: string, after: string) => {
    changedFields++;
    if (samples.length < 20) {
      samples.push(`  ${id} ${field}\n    - ${before.slice(0, 130)}\n    + ${after.slice(0, 130)}`);
    }
  };

  /** Rewrite every string reachable from a question, recording what changed. */
  function walk(value: unknown, id: string, pathLabel: string): unknown {
    if (typeof value === "string") {
      const next = wrapBareLatex(value);
      if (next !== value) note(id, pathLabel, value, next);
      return next;
    }
    if (Array.isArray(value)) return value.map((v, i) => walk(v, id, `${pathLabel}[${i}]`));
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        // Identifiers and enum-like fields are never prose; leave them exactly.
        out[k] = k === "id" || k === "type" || k === "status" || k === "difficulty"
          ? v
          : walk(v, id, pathLabel ? `${pathLabel}.${k}` : k);
      }
      return out;
    }
    return value;
  }

  const repaired = bank.map((q) => {
    const id = String(q.id ?? "?");
    const before = changedFields;
    const next = walk(q, id, "") as Record<string, unknown>;
    if (changedFields > before) changedQuestions++;
    return next;
  });

  console.log(`[latex] ${changedFields} field(s) across ${changedQuestions} question(s) need delimiters.`);
  if (samples.length > 0) {
    console.log("\nsample diffs:");
    console.log(samples.join("\n"));
  }

  if (WRITE) {
    const snapshot = BANK_PATH.replace(/\.json$/, ".pre-latex.json");
    if (!fs.existsSync(snapshot)) fs.writeFileSync(snapshot, raw);
    fs.writeFileSync(BANK_PATH, JSON.stringify(repaired, null, 2) + "\n");
    console.log(`\n[latex] Written. Original snapshot at ${path.basename(snapshot)}.`);
    console.log("[latex] Run `npm run seed` to apply to the database.");
  } else {
    console.log("\n[latex] Dry run. Re-run with --write to apply.");
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop() ?? "")) {
  main();
}
