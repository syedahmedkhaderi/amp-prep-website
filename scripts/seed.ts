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

function loadVerified() {
  if (fs.existsSync(QUESTIONS_PATH)) {
    const data = JSON.parse(fs.readFileSync(QUESTIONS_PATH, "utf-8"));
    return data.filter((q: any) => q.verified !== false);
  }
  if (fs.existsSync(FALLBACK_PATH)) {
    console.log("[seed] Verified file not found, using raw questions.json");
    return JSON.parse(fs.readFileSync(FALLBACK_PATH, "utf-8"));
  }
  console.error("[seed] No questions file found. Run generate first.");
  process.exit(1);
}

function seed() {
  initDB();
  const db = getDB();

  // Load topics outline
  const topicsFile = JSON.parse(fs.readFileSync(TOPICS_PATH, "utf-8"));
  const allTopics = [...topicsFile.amp1, ...topicsFile.amp2];

  // Get exam IDs
  const exams = db.prepare("SELECT * FROM exams").all() as any[];
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

  // Clear existing questions
  db.prepare("DELETE FROM question_options").run();
  db.prepare("DELETE FROM question_matches").run();
  db.prepare("DELETE FROM question_match_choices").run();
  db.prepare("DELETE FROM numeric_answers").run();
  db.prepare("DELETE FROM questions").run();

  const questions = loadVerified();
  console.log(`[seed] Loading ${questions.length} questions.`);

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

  for (const q of questions) {
    // Find topic and exam
    const topicSlug = q.topic_slug;
    const topicRow = db.prepare("SELECT id, exam_id FROM topics WHERE slug = ?").get(topicSlug) as any;
    if (!topicRow) {
      console.warn(`  [seed] Topic not found: ${topicSlug}`);
      continue;
    }

    // Determine exam from topic
    const examRow = db.prepare("SELECT code FROM exams WHERE id = ?").get(topicRow.exam_id) as any;
    const isAMP1 = examRow?.code === "AMP1";

    // Mark ~40% of AMP1 questions as free
    const isFree = isAMP1 && Math.random() < 0.4;
    if (isFree) freeCount++;

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
        "published",
        isFree ? 1 : 0
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
      if (q.numeric_answer) {
        insertNumeric.run(
          "na_" + uid(),
          q.id,
          q.numeric_answer.value,
          q.numeric_answer.tolerance || 0,
          JSON.stringify(q.numeric_answer.accepted || [])
        );
      }

      inserted++;
    } catch (e: any) {
      console.warn(`  [seed] Failed to insert ${q.id}: ${e.message}`);
    }
  }

  console.log(`[seed] Done. Inserted ${inserted} questions (${freeCount} marked free).`);

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
