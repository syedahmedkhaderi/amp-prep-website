/**
 * Data access layer. Reads questions, topics, exams, attempts from SQLite.
 * This is the single source of truth for the app's data queries.
 *
 * In production, replace these functions with Supabase queries that respect
 * RLS. The function signatures stay the same.
 */

import { getDB, initDB } from "@/lib/db/sqlite";
import type { Exam, Topic, Question, Attempt, Option, MatchItem, Paper } from "@/lib/types";
import type { QType, Difficulty, ExamCode } from "@/lib/types";

const uid = () => Math.random().toString(36).slice(2, 12);
const MAX_QUESTION_LIMIT = 200;

const EXAM_COLUMNS = "id, code, title, description, duration_minutes, total_questions";
const TOPIC_COLUMNS = "id, exam_id, name, slug, order_index, description";
const QUESTION_COLUMNS = `
  q.id, q.exam_id, q.topic_id, q.type, q.stem, q.difficulty, q.points,
  q.final_answer, q.explanation_steps, q.distractor_rationales,
  q.concept_summary, q.source, q.status, q.is_free, q.created_at
`;

function normalizeLimit(limit?: number): number | null {
  if (limit === undefined) return null;
  if (!Number.isFinite(limit)) return MAX_QUESTION_LIMIT;
  return Math.max(1, Math.min(Math.floor(limit), MAX_QUESTION_LIMIT));
}

function normalizeOffset(offset?: number): number {
  if (!offset || !Number.isFinite(offset)) return 0;
  return Math.max(0, Math.floor(offset));
}

export function getExams(): Exam[] {
  initDB();
  const db = getDB();
  const rows = db.prepare(`SELECT ${EXAM_COLUMNS} FROM exams ORDER BY code`).all() as any[];
  return rows.map(rowToExam);
}

export function getExamByCode(code: ExamCode): Exam | null {
  initDB();
  const db = getDB();
  const row = db.prepare(`SELECT ${EXAM_COLUMNS} FROM exams WHERE code = ?`).get(code) as any;
  return row ? rowToExam(row) : null;
}

export function getTopics(examCode?: ExamCode): Topic[] {
  initDB();
  const db = getDB();
  let rows: any[];
  if (examCode) {
    rows = db.prepare(
      `SELECT t.${TOPIC_COLUMNS.replace(/, /g, ", t.")}, e.code as exam_code FROM topics t
       JOIN exams e ON t.exam_id = e.id
       WHERE e.code = ? ORDER BY t.order_index`
    ).all(examCode) as any[];
  } else {
    rows = db.prepare(
      `SELECT t.${TOPIC_COLUMNS.replace(/, /g, ", t.")}, e.code as exam_code FROM topics t
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
    `SELECT t.${TOPIC_COLUMNS.replace(/, /g, ", t.")}, e.code as exam_code FROM topics t
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
  const limit = normalizeLimit(opts.limit);
  const offset = normalizeOffset(opts.offset);
  let query = `
    SELECT ${QUESTION_COLUMNS}, t.name as topic_name, t.slug as topic_slug, e.code as exam_code
    FROM questions q
    JOIN topics t ON q.topic_id = t.id
    JOIN exams e ON q.exam_id = e.id
    WHERE ${where}
    ORDER BY q.difficulty, q.created_at
  `;
  if (limit !== null) {
    query += " LIMIT ?";
    params.push(limit);
    if (offset > 0) {
      query += " OFFSET ?";
      params.push(offset);
    }
  }

  const rows = db.prepare(query).all(...params) as any[];
  return rowsToQuestions(rows, db);
}

export function getQuestionById(id: string): Question | null {
  return getQuestionsByIds([id])[0] ?? null;
}

export function getQuestionsByIds(ids: string[]): Question[] {
  initDB();
  if (ids.length === 0) return [];
  const db = getDB();
  const uniqueIds = [...new Set(ids)];
  const placeholders = uniqueIds.map(() => "?").join(",");
  const rows = db.prepare(
    `SELECT ${QUESTION_COLUMNS}, t.name as topic_name, t.slug as topic_slug
     FROM questions q
     JOIN topics t ON q.topic_id = t.id
     WHERE q.id IN (${placeholders})`
  ).all(...uniqueIds) as any[];

  const byId = new Map(rowsToQuestions(rows, db).map((question) => [question.id, question]));
  return ids.map((id) => byId.get(id)).filter((question): question is Question => !!question);
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

export function getTopicQuestionStats(topicId: string): {
  total: number;
  easy: number;
  hard: number;
  sample: Pick<Question, "id" | "type" | "stem" | "difficulty"> | null;
} {
  initDB();
  const db = getDB();
  const counts = db.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN difficulty = 'easy' THEN 1 ELSE 0 END) as easy,
       SUM(CASE WHEN difficulty = 'hard' THEN 1 ELSE 0 END) as hard
     FROM questions
     WHERE topic_id = ? AND status = 'published'`
  ).get(topicId) as any;
  const sample = db.prepare(
    `SELECT id, type, stem, difficulty
     FROM questions
     WHERE topic_id = ? AND status = 'published'
     ORDER BY difficulty, created_at
     LIMIT 1`
  ).get(topicId) as any;

  return {
    total: counts?.total || 0,
    easy: counts?.easy || 0,
    hard: counts?.hard || 0,
    sample: sample || null,
  };
}

/**
 * Papers for an exam, excluding any that have no questions attached.
 *
 * A paper row and its paper_questions rows are written by two different steps,
 * and re-seeding the question bank clears the second without touching the
 * first. When that happened, /mock listed every numbered exam with a working
 * Start link and each one bounced straight back to /mock?reason=no-questions.
 * An honest empty list is better than a menu of exams that cannot be sat.
 */
export function getPapers(examCode: ExamCode): Paper[] {
  initDB();
  const db = getDB();
  const rows = db.prepare(
    `SELECT p.id, p.exam_code, p.name, p.is_free, p.order_index,
       (SELECT COUNT(*) FROM paper_questions pq WHERE pq.paper_id = p.id) as question_count
     FROM papers p
     WHERE p.exam_code = ?
       AND EXISTS (SELECT 1 FROM paper_questions pq WHERE pq.paper_id = p.id)
     ORDER BY p.is_free DESC, p.order_index`
  ).all(examCode) as any[];
  return rows.map(rowToPaper);
}

export function getPaperById(paperId: string): Paper | null {
  initDB();
  const db = getDB();
  const row = db.prepare(
    `SELECT p.id, p.exam_code, p.name, p.is_free, p.order_index,
       (SELECT COUNT(*) FROM paper_questions pq WHERE pq.paper_id = p.id) as question_count
     FROM papers p
     WHERE p.id = ?`
  ).get(paperId) as any;
  return row ? rowToPaper(row) : null;
}

// ---------- Row mappers ----------

function rowToPaper(row: any): Paper {
  return {
    id: row.id,
    examCode: row.exam_code,
    name: row.name,
    isFree: !!row.is_free,
    orderIndex: row.order_index,
    questionCount: row.question_count,
  };
}

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

function rowsToQuestions(rows: any[], db: ReturnType<typeof getDB>): Question[] {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(",");

  const optionRows = db.prepare(
    `SELECT id, question_id, content, is_correct, order_index
     FROM question_options
     WHERE question_id IN (${placeholders})
     ORDER BY question_id, order_index`
  ).all(...ids) as any[];
  const matchRows = db.prepare(
    `SELECT id, question_id, left_content, correct_choice_index, order_index
     FROM question_matches
     WHERE question_id IN (${placeholders})
     ORDER BY question_id, order_index`
  ).all(...ids) as any[];
  const matchChoiceRows = db.prepare(
    `SELECT question_id, choice_text, order_index
     FROM question_match_choices
     WHERE question_id IN (${placeholders})
     ORDER BY question_id, order_index`
  ).all(...ids) as any[];
  const numericRows = db.prepare(
    `SELECT question_id, correct_value, tolerance, accepted_expressions
     FROM numeric_answers
     WHERE question_id IN (${placeholders})`
  ).all(...ids) as any[];

  const optionsByQuestion = groupBy(optionRows, "question_id");
  const matchesByQuestion = groupBy(matchRows, "question_id");
  const matchChoicesByQuestion = groupBy(matchChoiceRows, "question_id");
  const numericByQuestion = new Map(numericRows.map((row) => [row.question_id, row]));

  return rows.map((row) =>
    rowToQuestion(row, {
      options: optionsByQuestion.get(row.id) || [],
      matches: matchesByQuestion.get(row.id) || [],
      matchChoices: matchChoicesByQuestion.get(row.id) || [],
      numericAnswer: numericByQuestion.get(row.id),
    })
  );
}

function groupBy(rows: any[], key: string): Map<string, any[]> {
  const grouped = new Map<string, any[]>();
  for (const row of rows) {
    const group = grouped.get(row[key]) || [];
    group.push(row);
    grouped.set(row[key], group);
  }
  return grouped;
}

function parseAcceptedExpressions(value: string | null): string[] {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function rowToQuestion(
  row: any,
  children: {
    options: any[];
    matches: any[];
    matchChoices: any[];
    numericAnswer?: any;
  }
): Question {
  const options: Option[] | undefined =
    row.type === "single_mcq" || row.type === "multi_mcq" || row.type === "fill_blank"
      ? children.options.map((o) => ({
          id: o.id,
          content: o.content,
          isCorrect: !!o.is_correct,
          orderIndex: o.order_index,
        }))
      : undefined;

  const matches: MatchItem[] | undefined =
    row.type === "matching"
      ? children.matches.map((m) => ({
          id: m.id,
          leftContent: m.left_content,
          correctChoiceIndex: m.correct_choice_index,
          orderIndex: m.order_index,
        }))
      : undefined;
  const matchChoices: string[] | undefined =
    row.type === "matching" ? children.matchChoices.map((c) => c.choice_text) : undefined;

  const numericAnswer: Question["numericAnswer"] | undefined =
    row.type === "numeric" && children.numericAnswer
      ? {
          correctValue: children.numericAnswer.correct_value,
          tolerance: children.numericAnswer.tolerance,
          acceptedExpressions: parseAcceptedExpressions(children.numericAnswer.accepted_expressions),
        }
      : undefined;

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
