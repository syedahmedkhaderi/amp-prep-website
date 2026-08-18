import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";
import { initDB, getDB } from "../lib/db/sqlite";

loadScriptsEnv();

/**
 * Seed the SQLite database from the verified questions JSON.
 * Reads /data/generated/questions-verified.json (or questions.json as fallback),
 * inserts topics, questions, options, matches, and numeric answers.
 *
 * Marks approximately 40% of AMP 1 questions as is_free for the free tier.
 */

const QUESTIONS_PATH = path.resolve(process.cwd(), "data/generated/questions-verified.json");
const FALLBACK_PATH = path.resolve(process.cwd(), "data/generated/questions.json");
const TOPICS_PATH = path.resolve(process.cwd(), "data/generated/topics.json");

const uid = () => Math.random().toString(36).slice(2, 12);

function validateQuestion(q: any): string | null {
  if (!q?.id) return "missing id";
  if (!q.topic_slug) return "missing topic slug";
  if (!q.type) return "missing question type";
  if (!q.stem) return "missing stem";

  if (["single_mcq", "multi_mcq", "fill_blank"].includes(q.type)) {
    if (!Array.isArray(q.options) || q.options.length === 0) return "missing options";
    if (q.options.some((opt: any) => !opt?.content)) return "option content is missing";

    // A question with no option flagged correct cannot be answered correctly by
    // anyone: gradeChoice and gradeMultiChoice both return isCorrect: false
    // unconditionally when nothing is flagged. 23 such questions were shipping
    // (16 multi_mcq, 7 fill_blank), scoring every student zero however well they
    // understood the material, with no signal that the question was the problem.
    //
    // Rejecting here makes the bank smaller and correct rather than larger and
    // silently unfair. It also surfaces the count at every seed, so a
    // regenerated bank cannot quietly reintroduce them.
    const correctCount = q.options.filter((opt: any) => opt.is_correct).length;
    if (correctCount === 0) return "no correct option flagged";
    if (q.type !== "multi_mcq" && correctCount > 1) {
      // gradeChoice resolves the key with .find(), so it only ever credits the
      // first. A second flagged option marks a genuinely correct student wrong.
      return "more than one correct option on a single-answer question";
    }
  }

  if (q.type === "matching") {
    if (!Array.isArray(q.matches) || q.matches.length === 0) return "missing match rows";
    if (!Array.isArray(q.match_choices) || q.match_choices.length === 0) return "missing match choices";
    const invalidMatch = q.matches.some(
      (m: any) =>
        !m?.left_content ||
        !Number.isInteger(m.correct_choice_index) ||
        m.correct_choice_index < 0 ||
        m.correct_choice_index >= q.match_choices.length
    );
    if (invalidMatch) return "invalid match answer index";
  }

  if (q.type === "numeric" && typeof q.numeric_answer?.value !== "number") {
    return "missing numeric answer";
  }

  return null;
}

/**
 * Fraction of the raw bank the verified file must contain before it is trusted.
 *
 * `npm run verify` writes questions-verified.json incrementally while calling
 * an external API for every question, so an interruption — a rate limit, a
 * dropped connection, Ctrl-C — leaves a short but perfectly valid JSON file
 * behind. Because seeding prefers that file, the next seed would rebuild the
 * site from whatever fraction had been written, with no error: a run
 * interrupted early once left a 50-question file against a 3,789-question
 * bank, which would have published a site with 1% of its content.
 *
 * Refusing is the only safe response. Seeding is destructive and there is no
 * undo, so a partial file has to stop the run rather than quietly shrink the
 * product.
 */
const VERIFIED_MIN_COVERAGE = 0.9;

/**
 * Traces of the generator arguing with itself mid-explanation.
 *
 * The bank is model-generated and its answer keys have never been checked by a
 * person. A 30-question blind audit put the wrong-key rate at 6.7% (95% CI
 * 0.8-22.1%), which extrapolates to roughly 250 wrong keys across the bank —
 * errors in the mathematics itself, which no structural check can find.
 *
 * The one wrong key that the audit sample happened to catch was produced this
 * way: the model computed correctly, then overrode itself part-way through the
 * explanation with a fabricated intermediate value. That signature is
 * mechanically detectable, and it is the single highest-yield filter available.
 */
const SELF_CORRECTION =
  /\bWait\b|\bwait,|Re-evaluating|Recalculating|Correction:|let me recheck|I made an error/i;

const PLAIN_NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * Questions that are held back from publication pending human review.
 *
 * These are not malformed — validateQuestion passes them — so they are seeded
 * and kept, but with a status the site does not serve. That is deliberate:
 * deleting them would lose work, while publishing them risks teaching a student
 * the wrong method. They can be released in bulk once reviewed, with
 * `UPDATE questions SET status='published' WHERE status='needs_review'`.
 */
function heldForReview(q: any): string | null {
  // An upstream repair script may already have quarantined this question, for
  // example scripts/repair-notation.ts when a math delimiter has gone missing
  // and cannot be safely guessed back. Seeding used to compute status purely
  // from its own rules and silently overwrote that decision, republishing
  // questions another pass had deliberately pulled.
  if (q.status === "needs_review") return "quarantined by an earlier repair pass";
  if (q.status === "retired") return "retired as a duplicate of another question";

  const prose = [...(q.explanation_steps || []), q.concept_summary || ""].join(" ");
  if (SELF_CORRECTION.test(prose)) return "explanation contradicts itself mid-derivation";

  // A numeric question keyed to 0 whose accepted answers are symbolic has the
  // real answer only in the accepted list. Typing "0" scores; writing the actual
  // answer in any form not spelled exactly as listed fails. Both halves are
  // wrong and neither is fixable in the grader.
  const na = q.numeric_answer;
  if (
    q.type === "numeric" &&
    na &&
    na.value === 0 &&
    (na.accepted || []).some((a: any) => !PLAIN_NUMBER.test(String(a).trim()))
  ) {
    return "numeric answer keyed to 0 with a symbolic accepted form";
  }

  return null;
}

function loadVerified() {
  const rawExists = fs.existsSync(FALLBACK_PATH);

  if (fs.existsSync(QUESTIONS_PATH)) {
    const data = JSON.parse(fs.readFileSync(QUESTIONS_PATH, "utf-8"));

    if (rawExists) {
      const raw = JSON.parse(fs.readFileSync(FALLBACK_PATH, "utf-8"));
      if (data.length < raw.length * VERIFIED_MIN_COVERAGE) {
        console.error(
          `[seed] REFUSING TO SEED: ${QUESTIONS_PATH} holds ${data.length} questions ` +
            `but ${FALLBACK_PATH} holds ${raw.length}.`
        );
        console.error(
          "[seed] That gap means the verify pass did not finish, and seeding from it " +
            "would replace the question bank with a fraction of itself."
        );
        console.error(
          "[seed] Either re-run `npm run verify` to completion, or delete the partial " +
            "file to seed from the raw bank instead."
        );
        process.exit(1);
      }
    }

    return data.filter((q: any) => q.verified !== false);
  }

  if (rawExists) {
    console.log("[seed] Verified file not found, using raw questions.json");
    return JSON.parse(fs.readFileSync(FALLBACK_PATH, "utf-8"));
  }

  console.error("[seed] No questions file found. Run generate first.");
  process.exit(1);
}

function seed() {
  initDB();
  const db = getDB();

  // Read and validate every input BEFORE touching the database.
  //
  // The deletes below are destructive and there is no undo. This used to run
  // after them, so anything that made loading fail — a partial verified file,
  // malformed JSON, a missing topics file — emptied the question tables and
  // then exited, leaving a site with no content and no way back except another
  // successful seed. Loading first means a bad input costs nothing.
  const questions = loadVerified();
  const topicsFile = JSON.parse(fs.readFileSync(TOPICS_PATH, "utf-8"));
  const allTopics = [...topicsFile.amp1, ...topicsFile.amp2];
  console.log(`[seed] Loading ${questions.length} questions.`);

  // Get exam IDs
  const exams = db.prepare("SELECT id, code FROM exams").all() as any[];
  const amp1Exam = exams.find((e) => e.code === "AMP1");
  const amp2Exam = exams.find((e) => e.code === "AMP2");

  // Insert topics
  const insertTopic = db.prepare(
    "INSERT OR IGNORE INTO topics (id, exam_id, name, slug, order_index, description) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const t of topicsFile.amp1) {
    insertTopic.run("top_" + t.slug, amp1Exam.id, t.name, t.slug, t.index, t.description);
  }
  for (const t of topicsFile.amp2) {
    insertTopic.run("top_" + t.slug, amp2Exam.id, t.name, t.slug, t.index, t.description);
  }

  // Clear existing data (order matters for foreign keys)
  db.prepare("DELETE FROM paper_questions").run();
  db.prepare("DELETE FROM attempt_answers").run();
  db.prepare("DELETE FROM attempt_questions").run();
  db.prepare("DELETE FROM question_options").run();
  db.prepare("DELETE FROM question_matches").run();
  db.prepare("DELETE FROM question_match_choices").run();
  db.prepare("DELETE FROM numeric_answers").run();
  db.prepare("DELETE FROM questions").run();

  const insertQ = db.prepare(
    `INSERT INTO questions
     (id, exam_id, topic_id, type, stem, difficulty, points, explanation_steps,
      final_answer, distractor_rationales, concept_summary, source, status, is_free)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertOpt = db.prepare(
    "INSERT INTO question_options (id, question_id, content, is_correct, order_index) VALUES (?, ?, ?, ?, ?)"
  );
  const insertMatch = db.prepare(
    "INSERT INTO question_matches (id, question_id, left_content, correct_choice_index, order_index) VALUES (?, ?, ?, ?, ?)"
  );
  const insertMatchChoice = db.prepare(
    "INSERT INTO question_match_choices (id, question_id, choice_text, order_index) VALUES (?, ?, ?, ?)"
  );
  const insertNumeric = db.prepare(
    "INSERT INTO numeric_answers (id, question_id, correct_value, tolerance, accepted_expressions) VALUES (?, ?, ?, ?, ?)"
  );

  let inserted = 0;
  let freeCount = 0;
  let skipped = 0;
  let held = 0;
  const heldReasons: Record<string, number> = {};

  for (const q of questions) {
    // Find topic and exam
    const topicSlug = q.topic_slug;
    const topicRow = db.prepare("SELECT id, exam_id FROM topics WHERE slug = ?").get(topicSlug) as any;
    if (!topicRow) {
      console.warn(`  [seed] Topic not found: ${topicSlug}`);
      skipped++;
      continue;
    }

    const invalidReason = validateQuestion(q);
    if (invalidReason) {
      // Name the question and the reason. A bare count hides content defects:
      // these questions are silently absent from the site, so the only way
      // anyone notices is if the skip tells them which ones and why.
      console.warn(`  [seed] Skipping ${q.id} (${q.type}): ${invalidReason}`);
      skipped++;
      continue;
    }

    // Determine exam from topic
    const examRow = db.prepare("SELECT code FROM exams WHERE id = ?").get(topicRow.exam_id) as any;
    const isAMP1 = examRow?.code === "AMP1";

    // Mark ~40% of AMP1 questions as free
    const isFree = isAMP1 && Math.random() < 0.4;

    // Held-back questions are stored but not served: every query the site runs
    // filters on status = 'published'.
    const reviewReason = heldForReview(q);
    if (reviewReason) {
      held++;
      heldReasons[reviewReason] = (heldReasons[reviewReason] || 0) + 1;
    }

    try {
      insertQ.run(
        q.id,
        topicRow.exam_id,
        topicRow.id,
        q.type,
        q.stem,
        q.difficulty || "medium",
        1,
        JSON.stringify(q.explanation_steps || []),
        q.final_answer || "",
        JSON.stringify(q.distractor_rationales || {}),
        q.concept_summary || "",
        "generated",
        // A retired duplicate keeps its own status so it stays distinguishable
        // from a question a human still needs to look at.
        q.status === "retired" ? "retired" : reviewReason ? "needs_review" : "published",
        reviewReason ? 0 : isFree ? 1 : 0
      );

      // Options
      if (q.options) {
        q.options.forEach((opt: any, i: number) => {
          insertOpt.run("opt_" + uid(), q.id, opt.content, opt.is_correct ? 1 : 0, i);
        });
      }

      // Matches
      if (q.matches) {
        q.matches.forEach((m: any, i: number) => {
          insertMatch.run("m_" + uid(), q.id, m.left_content, m.correct_choice_index, i);
        });
      }
      if (q.match_choices) {
        q.match_choices.forEach((c: string, i: number) => {
          insertMatchChoice.run("mc_" + uid(), q.id, c, i);
        });
      }

      // Numeric
      if (q.numeric_answer && typeof q.numeric_answer.value === "number") {
        insertNumeric.run(
          "na_" + uid(),
          q.id,
          q.numeric_answer.value,
          q.numeric_answer.tolerance || 0,
          JSON.stringify(q.numeric_answer.accepted || [])
        );
      }

      inserted++;
      if (isFree) freeCount++;
    } catch (e: any) {
      skipped++;
    }
  }

  console.log(`[seed] Done. Inserted ${inserted} questions (${freeCount} marked free).`);
  if (held > 0) {
    console.log(
      `[seed] Held ${held} back as needs_review — stored, but not served to students:`
    );
    for (const [reason, count] of Object.entries(heldReasons).sort((a, b) => b[1] - a[1])) {
      console.log(`  [seed]   ${count}  ${reason}`);
    }
    console.log(
      "  [seed] Release after review with: UPDATE questions SET status='published' WHERE status='needs_review';"
    );
  }
  if (skipped > 0) {
    console.log(`[seed] Skipped ${skipped} malformed or incomplete questions.`);
  }

  // Summary
  const counts = db.prepare(
    `SELECT
      (SELECT COUNT(*) FROM questions WHERE status = 'published') as total,
      (SELECT COUNT(*) FROM questions WHERE status = 'published' AND is_free = 1) as free,
      (SELECT COUNT(*) FROM topics) as topics`
  ).get() as any;
  console.log(`[seed] Database now has: ${counts.total} questions, ${counts.free} free, ${counts.topics} topics.`);
}

seed();
