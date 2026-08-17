import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";

loadScriptsEnv();

/**
 * Make numeric questions gradable by a human being.
 *
 * lib/grading.ts accepts a typed number when
 * `Math.abs(parsed - target) <= tolerance + 1e-9`. A large part of the bank was
 * generated with `tolerance: 0`, which is correct for an integer answer and
 * unanswerable for anything else: q_6wodbpiuenvr keys 3.1666666666666665 at a
 * tolerance of 1e-15, so a student would have to type sixteen significant
 * digits to be marked right. 93 numeric questions are in that state, 63 of them
 * published. Every one of them is currently marking correct work wrong.
 *
 * numeric_answer only reaches a student through the `numeric` branch of
 * gradeQuestion, so this repair leaves the other four types' answer keys alone.
 * It does delete the numeric_answer *object* from non-numeric questions, which
 * is inert at grading time but not harmless: scripts/seed.ts inserts a
 * numeric_answers row for any question carrying one regardless of type, which
 * is why 362 matching questions have one, and seed's heldForReview() then flags
 * the value-0 cases into needs_review for no reason.
 *
 *   npx tsx scripts/repair-tolerances.ts            # report only
 *   npx tsx scripts/repair-tolerances.ts --write    # snapshot, then repair
 *
 * The JSON bank is the source of truth; run `npm run seed` afterwards to carry
 * the change into data/amp-prep.db.
 */

const QUESTIONS_PATH = path.resolve(process.cwd(), "data/generated/questions.json");

/** Decimal places a student can reasonably be expected to type. */
const ROUND_DP = 4;

/**
 * Round to four decimal places, or to four significant figures when the answer
 * is smaller than that.
 *
 * A flat four-decimal round is wrong for small magnitudes and destroys the
 * answer outright at the bottom of the range: 1/59049 is 0.0000169, which
 * rounds to 0. Keeping four significant figures instead preserves the answer at
 * any scale while still cutting float noise like 3.1666666666666665.
 */
export function roundForTyping(value: number): number {
  if (value === 0 || !Number.isFinite(value)) return value;
  const decimals = Math.max(ROUND_DP, -Math.floor(Math.log10(Math.abs(value))) + 3);
  return Number(value.toFixed(Math.min(decimals, 100)));
}

interface NumericAnswer {
  value: number;
  tolerance?: number;
  accepted?: string[];
}

interface BankQuestion {
  id: string;
  type: string;
  status?: string;
  numeric_answer?: NumericAnswer | null;
  [key: string]: unknown;
}

/**
 * A tolerance wide enough to absorb the rounding a student actually does, and
 * no wider.
 *
 * The relative term carries large answers, where an absolute floor would be
 * meaninglessly tight. The absolute floor carries ordinary answers near 1,
 * where a student typing two decimal places can be off by up to 0.005.
 *
 * The floor is itself scaled down for small answers, which is the case a flat
 * floor gets dangerously wrong: 0.005 against a keyed 0.01 would accept
 * anything from 0.005 to 0.015, including answers that are wrong by half.
 */
export function repairedTolerance(value: number, existing: number): number {
  const magnitude = Math.abs(value);
  const relative = magnitude * 1e-3;
  const floor = Math.min(0.005, Math.max(magnitude * 0.02, 1e-6));
  return Math.max(existing, relative, floor);
}

/** Evaluate the simple forms that appear in accepted[]: "11/18", "-3.5", "7". */
function evalAccepted(expr: string): number | null {
  const text = expr.trim();
  if (/^[+-]?\d+(\.\d+)?$/.test(text)) return Number(text);
  const fraction = text.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }
  return null;
}

interface Report {
  toleranceWidened: string[];
  valueRounded: string[];
  strippedFromNonNumeric: string[];
  flaggedForReview: { id: string; reason: string }[];
}

function repair(questions: BankQuestion[]): Report {
  const report: Report = {
    toleranceWidened: [],
    valueRounded: [],
    strippedFromNonNumeric: [],
    flaggedForReview: [],
  };

  for (const q of questions) {
    const na = q.numeric_answer;
    if (!na) continue;

    // Strip from the four types that never read it, including the 91 that
    // carry an empty `{}` — those are just as capable of confusing a later
    // pass as a populated one, and no code path reads them.
    if (q.type !== "numeric") {
      delete q.numeric_answer;
      report.strippedFromNonNumeric.push(q.id);
      continue;
    }

    if (typeof na.value !== "number") continue;

    const originalValue = na.value;
    const originalTolerance = na.tolerance ?? 0;

    if (!Number.isInteger(originalValue)) {
      const rounded = roundForTyping(originalValue);
      if (rounded !== originalValue) {
        na.value = rounded;
        report.valueRounded.push(q.id);
      }
      const tolerance = repairedTolerance(na.value, originalTolerance);
      if (tolerance !== originalTolerance) {
        na.tolerance = tolerance;
        report.toleranceWidened.push(q.id);
      }
    }

    // An accepted form that resolves to a different number than the key is a
    // genuine contradiction in the answer key, not a formatting quirk. Which of
    // the two is right cannot be settled here, so the question goes to a human
    // rather than being silently repaired in one direction.
    const accepted = na.accepted ?? [];
    const tolerance = na.tolerance ?? 0;
    const contradictions = accepted.filter((expr) => {
      const parsed = evalAccepted(expr);
      return parsed !== null && Math.abs(parsed - na.value) > tolerance + 1e-9;
    });
    if (contradictions.length > 0) {
      q.status = "needs_review";
      report.flaggedForReview.push({
        id: q.id,
        reason: `accepted ${contradictions.map((c) => JSON.stringify(c)).join(", ")} disagrees with value ${na.value}`,
      });
    }
  }

  return report;
}

function main() {
  const write = process.argv.includes("--write");
  const raw = fs.readFileSync(QUESTIONS_PATH, "utf-8");
  const questions: BankQuestion[] = JSON.parse(raw);

  const ungradableBefore = questions.filter(
    (q) =>
      q.type === "numeric" &&
      q.numeric_answer &&
      !Number.isInteger(q.numeric_answer.value) &&
      (q.numeric_answer.tolerance ?? 0) <
        repairedTolerance(q.numeric_answer.value, 0)
  ).length;

  console.log(`[tolerances] ${questions.length} questions loaded from ${QUESTIONS_PATH}`);
  console.log(`[tolerances] ${ungradableBefore} numeric question(s) too tight to answer by hand`);

  const report = repair(questions);

  console.log(`[tolerances] tolerance widened:        ${report.toleranceWidened.length}`);
  console.log(`[tolerances] value rounded to ${ROUND_DP}dp:   ${report.valueRounded.length}`);
  console.log(`[tolerances] stripped from non-numeric: ${report.strippedFromNonNumeric.length}`);
  console.log(`[tolerances] flagged needs_review:      ${report.flaggedForReview.length}`);
  for (const f of report.flaggedForReview.slice(0, 10)) {
    console.log(`  ${f.id}: ${f.reason}`);
  }
  if (report.flaggedForReview.length > 10) {
    console.log(`  ...and ${report.flaggedForReview.length - 10} more`);
  }

  if (!write) {
    console.log("[tolerances] Report only. Re-run with --write to apply.");
    return;
  }

  const snapshot = `${QUESTIONS_PATH}.tolerance-backup`;
  if (!fs.existsSync(snapshot)) {
    fs.writeFileSync(snapshot, raw);
    console.log(`[tolerances] Snapshot written to ${snapshot}`);
  }

  fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(questions, null, 2) + "\n");

  const after = questions.filter(
    (q) =>
      q.type === "numeric" &&
      q.numeric_answer &&
      !Number.isInteger(q.numeric_answer.value) &&
      (q.numeric_answer.tolerance ?? 0) <
        repairedTolerance(q.numeric_answer.value, 0)
  ).length;
  console.log(`[tolerances] Written. Remaining too-tight numeric questions: ${after}`);
  console.log("[tolerances] Run `npm run seed` to carry this into data/amp-prep.db.");
}

if (require.main === module) main();
