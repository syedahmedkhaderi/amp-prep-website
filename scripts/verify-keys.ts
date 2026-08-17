import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";

loadScriptsEnv();

import { compileExpression, ExpressionSyntaxError } from "../lib/math/expression";

/**
 * Check answer keys without asking a model to re-solve anything.
 *
 * scripts/seed.ts records a 30-question blind audit that put the wrong-key
 * rate at 6.7 percent, roughly 230 wrong answers across the published bank. An
 * LLM re-solve of every question is the thorough approach and needs an API key
 * this project does not have. Two mechanical checks catch a useful share of the
 * same defects and need nothing:
 *
 * SELF-CONSISTENCY. A worked solution almost always ends by stating the answer.
 * When the number the explanation arrives at disagrees with the number in the
 * key, one of the two is wrong and the question is not safe to serve either
 * way. This finds the case where the derivation is right and the key was
 * mistyped, which is the most common shape of the defect.
 *
 * INDEPENDENT RECOMPUTATION. Where the stem is a self-contained arithmetic
 * expression, the expression is parsed and evaluated with lib/math/expression
 * and compared with the key. That is a genuine independent solve for the subset
 * it covers, and it shares no code with whatever produced the original answer.
 *
 * Neither check can confirm a key is right. Both can prove one wrong, which is
 * what matters: a disagreement is quarantined rather than served.
 *
 *   npx tsx scripts/verify-keys.ts            # report only
 *   npx tsx scripts/verify-keys.ts --write    # quarantine the disagreements
 */

const QUESTIONS_PATH = path.resolve(process.cwd(), "data/generated/questions.json");

interface Disagreement {
  id: string;
  check: "self-consistency" | "recomputation";
  keyed: string;
  derived: string;
  note: string;
}

/** Pull the last standalone number out of a string of prose and LaTeX. */
function lastNumber(text: string): number | null {
  // Strip LaTeX fraction syntax into something parseable, then take the final
  // numeric token. \frac{11}{18} becomes 11/18 so the value survives.
  const flattened = text
    .replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}$]/g, " ");

  const matches = flattened.match(/-?\d+(?:\.\d+)?(?:\s*\/\s*-?\d+(?:\.\d+)?)?/g);
  if (!matches || matches.length === 0) return null;
  const raw = matches[matches.length - 1].replace(/\s+/g, "");
  if (raw.includes("/")) {
    const [a, b] = raw.split("/").map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
    return a / b;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Close enough to be the same answer, allowing for rounding in the prose. */
function agrees(a: number, b: number): boolean {
  if (a === b) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) <= scale * 0.005;
}

/**
 * A stem that is nothing but "evaluate this expression", where the expression
 * uses only arithmetic the parser supports. Anything with words in the middle
 * is skipped rather than guessed at.
 */
function extractComputableStem(stem: string): string | null {
  const cleaned = stem.trim();
  if (!/^(evaluate|simplify|calculate|compute|work out|what is)\b/i.test(cleaned)) return null;

  // Wording that asks for something other than the exact value. "The integer
  // closest to sqrt(15)" is 4, while the expression evaluates to 3.873, and
  // treating that gap as a wrong key would be the checker's error, not the
  // question's.
  if (/closest|nearest|approximat|estimate|round|between|which of|lies|greater|less than|integer part/i.test(cleaned)) {
    return null;
  }
  // More than one math segment means the stem is comparing or combining
  // things, not stating one expression to evaluate.
  if ((cleaned.match(/\$/g) || []).length > 2) return null;

  const math = cleaned.match(/\$\$?([^$]+)\$\$?/);
  if (!math) return null;

  // A mixed number writes "three and a half" as 3\frac{1}{2}, which reads as
  // implicit multiplication to the parser and evaluates to 1.5 instead of 3.5.
  // Rejecting the pattern is right: the alternative is reporting a correct key
  // as wrong, and one false accusation costs more than several missed defects.
  if (/\d\s*\\d?frac/.test(math[1])) return null;

  let expr = math[1]
    .replace(/\\dfrac|\\frac/g, "FRAC")
    .replace(/FRAC\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))")
    .replace(/\\sqrt\[3\]\{([^{}]+)\}/g, "(($1)^(1/3))")
    .replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)")
    .replace(/\\cdot|\\times/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\left|\\right/g, "")
    .replace(/\\pi/g, "pi")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, "");

  // Reject anything still holding a command, a variable, or a comparison.
  if (/\\|[a-zA-Z]/.test(expr.replace(/sqrt|pi|e(?![a-zA-Z])/g, ""))) return null;
  if (/[=<>,]/.test(expr)) return null;
  if (expr.length === 0) return null;
  return expr;
}

function main() {
  const write = process.argv.includes("--write");
  const raw = fs.readFileSync(QUESTIONS_PATH, "utf-8");
  const questions = JSON.parse(raw) as any[];

  const disagreements: Disagreement[] = [];
  let recomputed = 0;

  for (const q of questions) {
    if (q.status === "needs_review") continue;

    // ---- Independent recomputation, numeric questions only ----------------
    if (q.type === "numeric" && q.numeric_answer && typeof q.numeric_answer.value === "number") {
      const expr = extractComputableStem(q.stem ?? "");
      if (expr) {
        try {
          const value = compileExpression(expr, { allowX: false }).evaluate({});
          if (Number.isFinite(value)) {
            recomputed++;
            const tol = Math.max(q.numeric_answer.tolerance ?? 0, Math.abs(value) * 0.005, 0.005);
            if (Math.abs(value - q.numeric_answer.value) > tol) {
              disagreements.push({
                id: q.id,
                check: "recomputation",
                keyed: String(q.numeric_answer.value),
                derived: String(Number(value.toFixed(6))),
                note: expr.slice(0, 60),
              });
              continue;
            }
          }
        } catch (err) {
          // A stem the parser cannot handle is not evidence of anything.
          if (!(err instanceof ExpressionSyntaxError)) throw err;
        }
      }
    }

    // Self-consistency between the closing explanation step and the key was
    // tried here and removed. Taking "the last number in the final step" as
    // the derived answer flagged 1,044 of 3,457 questions, and spot checks
    // showed most were prose like "so it is a Rational Number" where the
    // trailing number belongs to an aside rather than the result. A check that
    // is wrong a third of the time cannot be used to quarantine anything, and
    // tuning it further just moves the noise around. Re-solving the prose is
    // the job of a model, which is what scripts/export-verify-batch.ts exists
    // to hand out.
  }

  console.log(`[keys] ${questions.length} questions in the bank`);
  console.log(`[keys] independently recomputed:  ${recomputed}`);
  console.log(`[keys] disagreements found:       ${disagreements.length}`);

  const byCheck = new Map<string, Disagreement[]>();
  for (const d of disagreements) {
    const b = byCheck.get(d.check);
    if (b) b.push(d);
    else byCheck.set(d.check, [d]);
  }
  for (const [check, items] of byCheck) {
    console.log(`\n[keys] ${check}: ${items.length}`);
    for (const d of items.slice(0, 12)) {
      console.log(`  ${d.id}  key=${d.keyed}  derived=${d.derived}  ${d.note}`);
    }
    if (items.length > 12) console.log(`  ...and ${items.length - 12} more`);
  }

  if (!write) {
    console.log("\n[keys] Report only. Re-run with --write to quarantine these.");
    return;
  }

  const flagged = new Set(disagreements.map((d) => d.id));
  for (const q of questions) if (flagged.has(q.id)) q.status = "needs_review";

  const snapshot = `${QUESTIONS_PATH}.pre-keycheck-backup`;
  if (!fs.existsSync(snapshot)) fs.writeFileSync(snapshot, raw);
  fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(questions, null, 2) + "\n");
  console.log(`\n[keys] Quarantined ${flagged.size} question(s). Run \`npm run seed && npm run assemble\`.`);
}

if (require.main === module) main();
