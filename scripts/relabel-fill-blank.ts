import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";

loadScriptsEnv();

/**
 * Relabel fill_blank questions as single_mcq where they already are one.
 *
 * The real UDST placement tests, AMP 1 and AMP 2 alike, are 60 multiple-choice
 * questions in two hours. Mock exams should therefore be multiple choice only,
 * and the bank has just 651 published single_mcq to draw on, which is not
 * enough variety for 67 papers.
 *
 * It turns out most of the shortfall is a labelling problem rather than a
 * content problem. scripts/lib/prompts.ts specifies fill_blank as "4 radio
 * options, exactly one correct" — an MCQ whose stem happens to contain a blank
 * — and lib/grading.ts already grades fill_blank through the same gradeChoice
 * path as single_mcq. 749 of the 761 fill_blank questions have exactly four
 * options and exactly one correct answer, so they are single_mcq under another
 * name.
 *
 * This only retypes questions that already have the right shape. The dozen
 * that do not are left as they are and reported, because changing their
 * content is authoring, not relabelling.
 *
 *   npx tsx scripts/relabel-fill-blank.ts            # report only
 *   npx tsx scripts/relabel-fill-blank.ts --write
 */

const QUESTIONS_PATH = path.resolve(process.cwd(), "data/generated/questions.json");

interface BankQuestion {
  id: string;
  type: string;
  options?: { content?: string; is_correct?: boolean }[];
  [key: string]: unknown;
}

/** True when the question is already a four-option, one-answer MCQ. */
export function isMcqShaped(q: BankQuestion): boolean {
  const options = q.options ?? [];
  if (options.length !== 4) return false;
  if (options.some((o) => !o || typeof o.content !== "string" || !o.content.trim())) return false;
  return options.filter((o) => o.is_correct).length === 1;
}

function main() {
  const write = process.argv.includes("--write");
  const raw = fs.readFileSync(QUESTIONS_PATH, "utf-8");
  const questions: BankQuestion[] = JSON.parse(raw);

  const fillBlank = questions.filter((q) => q.type === "fill_blank");
  const eligible = fillBlank.filter(isMcqShaped);
  const skipped = fillBlank.filter((q) => !isMcqShaped(q));

  console.log(`[relabel] ${fillBlank.length} fill_blank question(s)`);
  console.log(`[relabel] ${eligible.length} already have MCQ shape and will be retyped`);
  console.log(`[relabel] ${skipped.length} left alone:`);
  for (const q of skipped) {
    const options = q.options ?? [];
    const correct = options.filter((o) => o?.is_correct).length;
    console.log(`  ${q.id}: ${options.length} option(s), ${correct} correct`);
  }

  const before = questions.filter((q) => q.type === "single_mcq").length;
  console.log(`[relabel] single_mcq before: ${before}, after: ${before + eligible.length}`);

  if (!write) {
    console.log("[relabel] Report only. Re-run with --write to apply.");
    return;
  }

  const snapshot = `${QUESTIONS_PATH}.pre-relabel-backup`;
  if (!fs.existsSync(snapshot)) {
    fs.writeFileSync(snapshot, raw);
    console.log(`[relabel] Snapshot written to ${snapshot}`);
  }

  for (const q of eligible) q.type = "single_mcq";
  fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(questions, null, 2) + "\n");

  const after = questions.filter((q) => q.type === "single_mcq").length;
  console.log(`[relabel] Written. single_mcq is now ${after}.`);
  console.log("[relabel] Run `npm run seed && npm run assemble` to rebuild the database and papers.");
}

if (require.main === module) main();
