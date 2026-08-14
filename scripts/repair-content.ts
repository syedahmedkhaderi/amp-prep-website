/**
 * Repair LaTeX in the question bank that is well-formed JSON but that KaTeX
 * cannot render, so the question would display broken to a student.
 *
 * This is the second half of the content fix. scripts/repair-latex.ts undoes
 * escape corruption — text that was damaged in transit. What is left here is
 * text that arrived intact but uses LaTeX the browser renderer does not
 * support: full-LaTeX document constructs (tabular, itemize) that only exist in
 * a real TeX distribution, and a handful of one-off mistakes from generation.
 *
 * Each rule is narrow and reports what it changed, because unlike the escape
 * repair these rewrites alter authored content rather than restoring it.
 *
 * Usage:
 *   npx tsx scripts/repair-content.ts          # report only
 *   npx tsx scripts/repair-content.ts --write  # apply
 */

import * as fs from "fs";
import * as path from "path";

const QUESTIONS_PATH = path.resolve(process.cwd(), "data/generated/questions.json");

/**
 * `only` limits a rule to specific question ids. Use it when a fix is a genuine
 * one-off: a pattern broad enough to catch the broken question also matches
 * correct ones elsewhere, and silently "fixing" those is worse than the bug.
 */
type Rule = { name: string; apply: (s: string) => string; only?: string[] };

const RULES: Rule[] = [
  {
    // \begin{tabular} is a LaTeX document environment with no KaTeX equivalent,
    // but \begin{array} takes the same column specification and supports
    // \hline, so the table survives as a table instead of being dropped.
    // Cells carry their own $...$ which would terminate the surrounding display
    // block, so inner delimiters are stripped: inside array the content is
    // already in math mode. Only *unescaped* $ is a delimiter — \$ is a literal
    // currency sign and stripping it would turn "\$1000s" into the invalid
    // command "\1000s".
    name: "tabular -> array (display)",
    apply: (s) =>
      s.replace(
        /\\begin\{tabular\}(\{[^}]*\})([\s\S]*?)\\end\{tabular\}/g,
        (_m, spec: string, body: string) =>
          `$$\\begin{array}${spec}${body.replace(/(?<!\\)\$/g, "")}\\end{array}$$`
      ),
  },
  {
    // itemize/\item likewise have no KaTeX equivalent. These appear in prose
    // explanation steps, not inside math, so plain dashed lines are the honest
    // rendering — MathText turns newlines into <br>.
    name: "itemize -> dashed lines",
    apply: (s) =>
      s
        .replace(/\\begin\{itemize\}\s*/g, "\n")
        .replace(/\\end\{itemize\}\s*/g, "\n")
        .replace(/\\item\s+/g, "\n- "),
  },
  {
    // A literal backslash-n that was meant as a line break, not the (nonexistent)
    // LaTeX command \n. The negative lookahead protects real commands that start
    // with n: \neq, \nu, \not, \nabla.
    name: "literal \\n -> newline",
    apply: (s) => s.replace(/\\n(?![a-zA-Z])/g, "\n"),
  },
  {
    // "$\\$612$" — a doubled backslash before a currency dollar inside math.
    // KaTeX needs the single escape \$.
    name: "\\\\$ -> \\$ (currency in math)",
    apply: (s) => s.replace(/\\\\\$/g, "\\$"),
  },
  {
    // \mu inside \text{} is a math command in text mode. Pull it out.
    name: "\\mu inside \\text{}",
    apply: (s) => s.replace(/\\text\{\s*\\mu\s*([a-zA-Z]+)\s*\}/g, "\\mu\\text{$1}"),
  },
  {
    // align* is display-only; aligned is its inline-capable equivalent.
    name: "align* -> aligned",
    apply: (s) => s.replace(/\\begin\{align\*\}/g, "\\begin{aligned}").replace(/\\end\{align\*\}/g, "\\end{aligned}"),
  },
  {
    // Fill-in-the-blank rules written as bare underscores. In math mode a run of
    // underscores is a stack of empty subscripts; \underline{\hspace{..}} is the
    // actual "blank to write in" primitive and renders as a rule.
    //
    // Only underscores that are unambiguously inside math are touched: the
    // argument of \text{}, or a $...$ segment that is nothing but underscores.
    // Underscores in ordinary prose ("the answer is ___") render fine as
    // literal text and must be left alone — a broader rule rewrote 312 of them.
    name: "underscore blanks -> \\underline",
    apply: (s) =>
      s
        .replace(/\\text\{_{2,}\}/g, "\\underline{\\hspace{2em}}")
        .replace(/\$_{3,}\$/g, "$\\underline{\\hspace{2em}}$")
        // A blank sitting where a math operand belongs: "y = ___", "2x(___)".
        .replace(/([=(])(\s*)_{3,}/g, "$1$2\\underline{\\hspace{2em}}"),
  },
  {
    // A \frac whose denominator ends in \cancel{...} was written with one
    // closing brace too many, leaving the expression unbalanced. Narrow to that
    // shape rather than trying to rebalance braces generally, which would risk
    // "fixing" correct expressions.
    name: "extra brace after \\cancel in \\frac",
    // Scoped to one question: the same "\cancel{...}}}" shape occurs legitimately
    // elsewhere (nested inside a larger \frac), where collapsing it breaks a
    // correct expression. Verified by applying it bank-wide and watching
    // q_tana314dc9ux go from rendering to failing.
    only: ["q_e9tpz0dowt98"],
    apply: (s) => s.replace(/(\\cancel\{[^{}]*\})\}\}/g, "$1}"),
  },
  {
    // \begin{center} is document layout with no math meaning and no KaTeX
    // equivalent; the content inside it stands on its own.
    name: "strip \\begin{center}",
    apply: (s) => s.replace(/\\(begin|end)\{center\}\s*/g, ""),
  },
  {
    // A bare % inside \text{} starts a LaTeX comment and swallows the closing
    // brace, so the whole segment fails to parse. It is meant as a percent sign.
    name: "bare % in \\text{} -> \\%",
    apply: (s) =>
      s.replace(/\\text\{([^{}]*)\}/g, (m, inner: string) =>
        inner.includes("%") && !/\\%/.test(inner)
          ? `\\text{${inner.replace(/%/g, "\\%")}}`
          : m
      ),
  },
];

function walk(value: unknown, tally: Map<string, number>, questionId: string): unknown {
  if (typeof value === "string") {
    let out = value;
    for (const rule of RULES) {
      if (rule.only && !rule.only.includes(questionId)) continue;
      const next = rule.apply(out);
      if (next !== out) tally.set(rule.name, (tally.get(rule.name) ?? 0) + 1);
      out = next;
    }
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => walk(v, tally, questionId));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v, tally, questionId);
    return out;
  }
  return value;
}

function main(): void {
  const write = process.argv.includes("--write");
  const raw = fs.readFileSync(QUESTIONS_PATH, "utf-8");
  const questions = JSON.parse(raw) as Record<string, unknown>[];

  const tally = new Map<string, number>();
  const repaired = questions.map((q) => walk(q, tally, String(q.id)) as Record<string, unknown>);

  const changedIds = questions
    .map((q, i) => (JSON.stringify(q) !== JSON.stringify(repaired[i]) ? String(q.id) : null))
    .filter((x): x is string => x !== null);

  console.log(`[content] ${questions.length} questions scanned`);
  for (const [name, count] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`         ${String(count).padStart(4)}  ${name}`);
  }
  console.log(`[content] ${changedIds.length} question(s) changed: ${changedIds.slice(0, 12).join(", ")}`);

  if (!write) {
    console.log("[content] Report only. Re-run with --write to apply.");
    return;
  }

  const snapshot = `${QUESTIONS_PATH}.pre-content-backup`;
  if (!fs.existsSync(snapshot)) fs.writeFileSync(snapshot, raw);
  fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(repaired, null, 2) + "\n");
  console.log(`[content] Written. Snapshot at ${snapshot}`);
}

main();
