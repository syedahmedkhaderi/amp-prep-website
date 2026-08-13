/**
 * Attempt lifecycle: create, add questions, save answers, submit, grade.
 * The attempt question set is fixed at creation time so a refresh restores
 * the exact state. Spec Section 13.
 */

import { getDB, initDB } from "@/lib/db/sqlite";
import { getQuestions, getQuestionById, getQuestionsByIds } from "@/lib/db/queries";
import { gradeAnswer } from "@/lib/grading";
import { countTodayPractice, countWeeklyMocks } from "@/lib/entitlements";
import type { Attempt, ClientSafeQuestion, Question } from "@/lib/types";
import { toClientSafe } from "@/lib/types";
import type { ExamCode } from "@/lib/types";

const uid = () => Math.random().toString(36).slice(2, 12);

export interface CreateAttemptInput {
  userId: string;
  examCode: ExamCode;
  mode: "practice" | "mock";
  topicSlug?: string;
  questionCount?: number;
  isPro: boolean;
  paperId?: string;
}

export interface CreatedAttempt {
  attemptId: string;
  questions: ClientSafeQuestion[];
  timeLimitSeconds: number | null;
  total: number;
}

export function createAttempt(input: CreateAttemptInput): CreatedAttempt {
  initDB();
  const db = getDB();

  // Entitlement checks
  if (input.mode === "practice") {
    const used = countTodayPractice(input.userId);
    if (!input.isPro && used >= 20) {
      throw new Error("Daily practice limit reached. Upgrade to Pro for unlimited practice.");
    }
  }
  if (input.mode === "mock") {
    const used = countWeeklyMocks(input.userId);
    if (!input.isPro && used >= 1) {
      throw new Error("Weekly mock limit reached. Upgrade to Pro for unlimited mocks.");
    }
  }

  const exam = db.prepare(
    "SELECT id, duration_minutes, total_questions FROM exams WHERE code = ?"
  ).get(input.examCode) as any;
  if (!exam) throw new Error("Exam not found.");

  // Gather questions
  let questions: Question[];
  let topicId: string | null = null;
  let paperId: string | null = null;
  let timeLimitSeconds: number | null = null;

  if (input.mode === "mock" && input.paperId) {
    const paper = db.prepare("SELECT id, exam_code, is_free FROM papers WHERE id = ?").get(input.paperId) as any;
    if (!paper || paper.exam_code !== input.examCode) {
      throw new Error("Mock paper not found.");
    }
    if (!paper.is_free && !input.isPro) {
      throw new Error("This mock paper requires a Pro subscription.");
    }
    paperId = paper.id;
    timeLimitSeconds = exam.duration_minutes * 60;
    const pqRows = db.prepare(
      "SELECT question_id FROM paper_questions WHERE paper_id = ? ORDER BY order_index"
    ).all(paperId) as any[];
    questions = getQuestionsByIds(pqRows.map((r) => r.question_id));
  } else if (input.mode === "mock") {
    const count = input.questionCount || exam.total_questions;
    timeLimitSeconds = exam.duration_minutes * 60;
    questions = getQuestions({
      examCode: input.examCode,
      isFree: input.isPro ? undefined : true,
      limit: count,
    });
    // Shuffle deterministically and pick the count
    questions = seededShuffle(questions, Date.now()).slice(0, count);
  } else {
    // Practice mode
    if (input.topicSlug) {
      const topic = db.prepare("SELECT id FROM topics WHERE slug = ?").get(input.topicSlug) as any;
      if (topic) topicId = topic.id;
      questions = getQuestions({
        topicId: topicId || undefined,
        examCode: input.examCode,
        isFree: input.isPro ? undefined : true,
        limit: input.questionCount || 10,
      });
    } else {
      questions = getQuestions({
        examCode: input.examCode,
        isFree: input.isPro ? undefined : true,
        limit: input.questionCount || 10,
      });
    }
    questions = seededShuffle(questions, Date.now()).slice(0, input.questionCount || 10);
  }

  if (questions.length === 0) {
    throw new Error("No questions available for this selection.");
  }

  // Create attempt
  const attemptId = "att_" + uid();
  db.prepare(
    `INSERT INTO attempts (id, user_id, exam_id, mode, topic_id, paper_id, total, time_limit_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(attemptId, input.userId, exam.id, input.mode, topicId, paperId, questions.length, timeLimitSeconds);

  // Fix question set
  const insertAQ = db.prepare(
    "INSERT INTO attempt_questions (id, attempt_id, question_id, order_index) VALUES (?, ?, ?, ?)"
  );
  questions.forEach((q, i) => {
    insertAQ.run("aq_" + uid(), attemptId, q.id, i);
  });

  return {
    attemptId,
    questions: questions.map((q) => toClientSafe(q)),
    timeLimitSeconds,
    total: questions.length,
  };
}

export function saveAnswer(
  attemptId: string,
  questionId: string,
  response: any,
  userId: string
): { saved: number; feedback?: any } {
  initDB();
  const db = getDB();

  const attempt = db.prepare(
    `SELECT id, user_id, mode, started_at, submitted_at, time_limit_seconds
     FROM attempts
     WHERE id = ?`
  ).get(attemptId) as any;
  if (!attempt) throw new Error("Attempt not found.");
  if (attempt.user_id !== userId) throw new Error("Forbidden.");
  if (attempt.submitted_at) throw new Error("Attempt already submitted.");

  // Time integrity: once a timed attempt's limit has elapsed, no further answers
  // are accepted. The client autosaves, so this is the authoritative cutoff.
  if (attempt.time_limit_seconds) {
    const startedMs = new Date(attempt.started_at + "Z").getTime();
    const elapsed = (Date.now() - startedMs) / 1000;
    if (elapsed >= attempt.time_limit_seconds) {
      throw new Error("Time is up. This attempt can no longer be changed.");
    }
  }

  const belongsToAttempt = db.prepare(
    "SELECT 1 FROM attempt_questions WHERE attempt_id = ? AND question_id = ?"
  ).get(attemptId, questionId);
  if (!belongsToAttempt) throw new Error("Question is not part of this attempt.");

  // Upsert answer
  const existing = db.prepare(
    "SELECT id FROM attempt_answers WHERE attempt_id = ? AND question_id = ?"
  ).get(attemptId, questionId) as any;

  if (existing) {
    db.prepare(
      "UPDATE attempt_answers SET response = ?, saved_at = datetime('now') WHERE id = ?"
    ).run(JSON.stringify(response), existing.id);
  } else {
    db.prepare(
      "INSERT INTO attempt_answers (id, attempt_id, question_id, response) VALUES (?, ?, ?, ?)"
    ).run("aa_" + uid(), attemptId, questionId, JSON.stringify(response));
  }

  const savedCount = (
    db.prepare("SELECT COUNT(*) as c FROM attempt_answers WHERE attempt_id = ?").get(attemptId) as any
  ).c;

  // Practice mode: return feedback for this question
  if (attempt.mode === "practice") {
    const question = getQuestionById(questionId);
    if (question) {
      const result = gradeAnswer(question, response);
      // Store grade
      db.prepare(
        "UPDATE attempt_answers SET is_correct = ?, points_awarded = ? WHERE attempt_id = ? AND question_id = ?"
      ).run(result.isCorrect ? 1 : 0, result.pointsAwarded, attemptId, questionId);

      return {
        saved: savedCount,
        feedback: {
          isCorrect: result.isCorrect,
          correctAnswer: result.correctAnswerText,
          explanationSteps: question.explanationSteps,
          finalAnswer: question.finalAnswer,
          distractorRationales: question.distractorRationales,
          conceptSummary: question.conceptSummary,
        },
      };
    }
  }

  return { saved: savedCount };
}

export function submitAttempt(attemptId: string): SubmitResult {
  initDB();
  const db = getDB();

  const attempt = db.prepare(
    "SELECT id, submitted_at FROM attempts WHERE id = ?"
  ).get(attemptId) as any;
  if (!attempt) throw new Error("Attempt not found.");
  if (attempt.submitted_at) throw new Error("Attempt already submitted.");

  const aqRows = db.prepare(
    "SELECT question_id FROM attempt_questions WHERE attempt_id = ? ORDER BY order_index"
  ).all(attemptId) as any[];
  const questionsById = new Map(
    getQuestionsByIds(aqRows.map((aq) => aq.question_id)).map((question) => [question.id, question])
  );
  const answersByQuestionId = new Map(
    (db.prepare(
      `SELECT id, question_id, response
       FROM attempt_answers
       WHERE attempt_id = ?`
    ).all(attemptId) as any[]).map((answer) => [answer.question_id, answer])
  );

  let totalPoints = 0;
  let earnedPoints = 0;

  for (const aq of aqRows) {
    const question = questionsById.get(aq.question_id);
    if (!question) continue;
    totalPoints += question.points;

    const answerRow = answersByQuestionId.get(aq.question_id);
    if (!answerRow) continue;

    const response = answerRow.response ? JSON.parse(answerRow.response) : null;
    if (!response) continue;

    const result = gradeAnswer(question, response);
    earnedPoints += result.pointsAwarded;

    db.prepare(
      "UPDATE attempt_answers SET is_correct = ?, points_awarded = ? WHERE id = ?"
    ).run(result.isCorrect ? 1 : 0, result.pointsAwarded, answerRow.id);
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  db.prepare(
    "UPDATE attempts SET submitted_at = datetime('now'), score = ? WHERE id = ?"
  ).run(score, attemptId);

  return {
    attemptId,
    score,
    totalQuestions: aqRows.length,
    earnedPoints: Math.round(earnedPoints * 100) / 100,
    totalPoints,
  };
}

export function submitUserAttempt(attemptId: string, userId: string): SubmitResult {
  initDB();
  const db = getDB();
  const attempt = db.prepare("SELECT user_id FROM attempts WHERE id = ?").get(attemptId) as any;
  if (!attempt) throw new Error("Attempt not found.");
  if (attempt.user_id !== userId) throw new Error("Forbidden.");
  return submitAttempt(attemptId);
}

export interface SubmitResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  earnedPoints: number;
  totalPoints: number;
}

export function getAttemptReview(attemptId: string): {
  attempt: any;
  questions: any[];
  answers: Map<string, any>;
} {
  initDB();
  const db = getDB();

  const attempt = db.prepare(
    `SELECT id, user_id, exam_id, mode, topic_id, started_at, submitted_at, score, total, time_limit_seconds
     FROM attempts
     WHERE id = ?`
  ).get(attemptId) as any;
  if (!attempt) throw new Error("Attempt not found.");

  const aqRows = db.prepare(
    "SELECT question_id FROM attempt_questions WHERE attempt_id = ? ORDER BY order_index"
  ).all(attemptId) as any[];

  const questions = getQuestionsByIds(aqRows.map((aq) => aq.question_id));

  const answerRows = db.prepare(
    "SELECT question_id, response, is_correct, points_awarded FROM attempt_answers WHERE attempt_id = ?"
  ).all(attemptId) as any[];

  const answers = new Map<string, any>();
  for (const a of answerRows) {
    answers.set(a.question_id, {
      response: a.response ? JSON.parse(a.response) : null,
      isCorrect: a.is_correct === 1,
      pointsAwarded: a.points_awarded,
    });
  }

  return { attempt, questions, answers };
}

export function getUserAttempts(userId: string, limit = 10): Attempt[] {
  initDB();
  const db = getDB();
  const rows = db.prepare(
    `SELECT id, user_id, exam_id, mode, topic_id, started_at, submitted_at, score, total, time_limit_seconds
     FROM attempts
     WHERE user_id = ?
     ORDER BY started_at DESC
     LIMIT ?`
  ).all(userId, limit) as any[];
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    examId: r.exam_id,
    mode: r.mode,
    topicId: r.topic_id,
    startedAt: r.started_at,
    submittedAt: r.submitted_at,
    score: r.score,
    total: r.total,
    timeLimitSeconds: r.time_limit_seconds,
  }));
}

export function getUserMockAttemptsByPaper(userId: string): Record<
  string,
  { attemptId: string; score: number | null; submittedAt: string | null; startedAt: string }
> {
  initDB();
  const db = getDB();
  const rows = db.prepare(
    `SELECT paper_id, id, score, submitted_at, started_at
     FROM attempts
     WHERE user_id = ? AND mode = 'mock' AND paper_id IS NOT NULL
     ORDER BY started_at DESC`
  ).all(userId) as any[];

  const byPaper: Record<string, { attemptId: string; score: number | null; submittedAt: string | null; startedAt: string }> = {};
  for (const r of rows) {
    if (!byPaper[r.paper_id]) {
      byPaper[r.paper_id] = {
        attemptId: r.id,
        score: r.score,
        submittedAt: r.submitted_at,
        startedAt: r.started_at,
      };
    }
  }
  return byPaper;
}

export function getUserProgressStats(userId: string): {
  questionsAnswered: number;
  totalQuestions: number;
  topicsStarted: number;
  totalTopics: number;
} {
  initDB();
  const db = getDB();

  const questionsAnswered = (db.prepare(
    `SELECT COUNT(DISTINCT aa.question_id) as c
     FROM attempt_answers aa
     JOIN attempts a ON aa.attempt_id = a.id
     WHERE a.user_id = ?`
  ).get(userId) as any).c;

  const topicsStarted = (db.prepare(
    `SELECT COUNT(DISTINCT q.topic_id) as c
     FROM attempt_answers aa
     JOIN attempts a ON aa.attempt_id = a.id
     JOIN questions q ON aa.question_id = q.id
     WHERE a.user_id = ?`
  ).get(userId) as any).c;

  const totalQuestions = (db.prepare(
    "SELECT COUNT(*) as c FROM questions WHERE status = 'published'"
  ).get() as any).c;
  const totalTopics = (db.prepare("SELECT COUNT(*) as c FROM topics").get() as any).c;

  return { questionsAnswered, totalQuestions, topicsStarted, totalTopics };
}

export function isAttemptExpired(attemptId: string): boolean {
  initDB();
  const db = getDB();
  const attempt = db.prepare(
    "SELECT started_at, submitted_at, time_limit_seconds FROM attempts WHERE id = ?"
  ).get(attemptId) as any;
  if (!attempt || !attempt.time_limit_seconds || attempt.submitted_at) return false;

  const started = new Date(attempt.started_at + "Z").getTime();
  const elapsed = (Date.now() - started) / 1000;
  return elapsed >= attempt.time_limit_seconds;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let rng = seed;
  for (let i = result.length - 1; i > 0; i--) {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    const j = rng % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
