/**
 * Data access layer. Reads questions, topics, exams, attempts from SQLite.
 * This is the single source of truth for the app's data queries.
 *
 * In production, replace these functions with Supabase queries that respect
 * RLS. The function signatures stay the same.
 */

import { getDB, initDB } from "@/lib/db/sqlite";
import type { Exam, Topic, Question, Attempt, Option, MatchItem } from "@/lib/types";
import type { QType, Difficulty, ExamCode } from "@/lib/types";

const uid = () => Math.random().toString(36).slice(2, 12);

export function getExams(): Exam[] {
  initDB();
  const db = getDB();
  const rows = db.prepare("SELECT * FROM exams ORDER BY code").all() as any[];
  return rows.map(rowToExam);
}

export function getExamByCode(code: ExamCode): Exam | null {
  initDB();
  const db = getDB();
  const row = db.prepare("SELECT * FROM exams WHERE code = ?").get(code) as any;
  return row ? rowToExam(row) : null;
}

export function getTopics(examCode?: ExamCode): Topic[] {
  initDB();
  const db = getDB();
  let rows: any[];
  if (examCode) {
    rows = db.prepare(
      `SELECT t.*, e.code as exam_code FROM topics t
       JOIN exams e ON t.exam_id = e.id
       WHERE e.code = ? ORDER BY t.order_index`
    ).all(examCode) as any[];
  } else {
    rows = db.prepare(
      `SELECT t.*, e.code as exam_code FROM topics t
       JOIN exams e ON t.exam_id = e.id
       ORDER BY e.code, t.order_index`
    ).all() as any[];
  }
  return rows.map(rowToTopic);
}

export function getTopicBySlug(slug: string): Topic | null {
  initDB();
  const db = getDB();
  const row = db.prepare(
    `SELECT t.*, e.code as exam_code FROM topics t
     JOIN exams e ON t.exam_id = e.id
     WHERE t.slug = ?`
  ).get(slug) as any;
  return row ? rowToTopic(row) : null;
}

export function getQuestions(opts: {
  topicId?: string;
  examCode?: ExamCode;
  status?: string;
  isFree?: boolean;
  limit?: number;
  offset?: number;
  difficulty?: Difficulty;
  type?: QType;
}): Question[] {
  initDB();
  const db = getDB();
  const conditions: string[] = ["q.status = 'published'"];
  const params: any[] = [];

  if (opts.topicId) {
    conditions.push("q.topic_id = ?");
    params.push(opts.topicId);
  }
  if (opts.examCode) {
    conditions.push("e.code = ?");
    params.push(opts.examCode);
  }
  if (opts.isFree !== undefined) {
    conditions.push("q.is_free = ?");
    params.push(opts.isFree ? 1 : 0);
  }
  if (opts.difficulty) {
    conditions.push("q.difficulty = ?");
    params.push(opts.difficulty);
  }
  if (opts.type) {
    conditions.push("q.type = ?");
    params.push(opts.type);
  }

  const where = conditions.join(" AND ");
  let query = `
    SELECT q.*, t.name as topic_name, t.slug as topic_slug, e.code as exam_code
    FROM questions q
    JOIN topics t ON q.topic_id = t.id
    JOIN exams e ON q.exam_id = e.id
    WHERE ${where}
    ORDER BY q.difficulty, q.created_at
  `;
  if (opts.limit) {
    query += ` LIMIT ${opts.limit}`;
    if (opts.offset) query += ` OFFSET ${opts.offset}`;
  }

  const rows = db.prepare(query).all(...params) as any[];
  return rows.map((r) => rowToQuestion(r, db));
}

export function getQuestionById(id: string): Question | null {
  initDB();
  const db = getDB();
  const row = db.prepare(
    `SELECT q.*, t.name as topic_name, t.slug as topic_slug
     FROM questions q
     JOIN topics t ON q.topic_id = t.id
     WHERE q.id = ?`
  ).get(id) as any;
  return row ? rowToQuestion(row, db) : null;
}

export function getQuestionCount(): { total: number; free: number; amp1: number; amp2: number } {
  initDB();
  const db = getDB();
  const total = (db.prepare("SELECT COUNT(*) as c FROM questions WHERE status = 'published'").get() as any).c;
  const free = (db.prepare("SELECT COUNT(*) as c FROM questions WHERE status = 'published' AND is_free = 1").get() as any).c;
  const amp1 = (db.prepare(
    `SELECT COUNT(*) as c FROM questions q JOIN exams e ON q.exam_id = e.id
     WHERE q.status = 'published' AND e.code = 'AMP1'`
  ).get() as any).c;
  const amp2 = (db.prepare(
    `SELECT COUNT(*) as c FROM questions q JOIN exams e ON q.exam_id = e.id
     WHERE q.status = 'published' AND e.code = 'AMP2'`
  ).get() as any).c;
  return { total, free, amp1, amp2 };
}

// ---------- Row mappers ----------

function rowToExam(row: any): Exam {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    durationMinutes: row.duration_minutes,
    totalQuestions: row.total_questions,
  };
}

function rowToTopic(row: any): Topic {
  return {
    id: row.id,
    examId: row.exam_id,
    name: row.name,
    slug: row.slug,
    orderIndex: row.order_index,
    description: row.description,
    examCode: row.exam_code,
  };
}

function rowToQuestion(row: any, db: ReturnType<typeof getDB>): Question {
  const options: Option[] | undefined =
    row.type === "single_mcq" || row.type === "multi_mcq" || row.type === "fill_blank"
      ? (db.prepare("SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index").all(row.id) as any[]).map(
          (o) => ({
            id: o.id,
            content: o.content,
            isCorrect: !!o.is_correct,
            orderIndex: o.order_index,
          })
        )
      : undefined;

  let matches: MatchItem[] | undefined;
  let matchChoices: string[] | undefined;
  if (row.type === "matching") {
    matches = (db.prepare("SELECT * FROM question_matches WHERE question_id = ? ORDER BY order_index").all(row.id) as any[]).map(
      (m) => ({
        id: m.id,
        leftContent: m.left_content,
        correctChoiceIndex: m.correct_choice_index,
        orderIndex: m.order_index,
      })
    );
    matchChoices = (db.prepare("SELECT * FROM question_match_choices WHERE question_id = ? ORDER BY order_index").all(row.id) as any[]).map(
      (c) => c.choice_text
    );
  }

  let numericAnswer: Question["numericAnswer"];
  if (row.type === "numeric") {
    const na = db.prepare("SELECT * FROM numeric_answers WHERE question_id = ?").get(row.id) as any;
    if (na) {
      numericAnswer = {
        correctValue: na.correct_value,
        tolerance: na.tolerance,
        acceptedExpressions: na.accepted_expressions ? JSON.parse(na.accepted_expressions) : [],
      };
    }
  }

  return {
    id: row.id,
    examId: row.exam_id,
    topicId: row.topic_id,
    type: row.type,
    stem: row.stem,
    difficulty: row.difficulty,
    points: row.points,
    explanationSteps: row.explanation_steps ? JSON.parse(row.explanation_steps) : [],
    finalAnswer: row.final_answer || "",
    distractorRationales: row.distractor_rationales ? JSON.parse(row.distractor_rationales) : {},
    conceptSummary: row.concept_summary || "",
    source: row.source,
    status: row.status,
    isFree: !!row.is_free,
    options,
    matches,
    matchChoices,
    numericAnswer,
    topicName: row.topic_name,
    topicSlug: row.topic_slug,
  };
}
