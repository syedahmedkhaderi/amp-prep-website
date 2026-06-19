/**
 * Database layer using SQLite (better-sqlite3) for local, self-contained
 * operation. The schema mirrors the Postgres model in the spec so migration
 * to Supabase is straightforward. The live site uses Supabase in production;
 * this SQLite layer powers local development and the offline pipeline seed.
 */

import Database from "better-sqlite3";
import type { Database as DBType } from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

const DB_PATH = path.resolve(process.cwd(), "data/amp-prep.db");

let dbInstance: DBType | null = null;

export function getDB(): DBType {
  if (dbInstance) return dbInstance;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  dbInstance = db;
  return db;
}

export function initDB(): void {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER NOT NULL,
      total_questions INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      order_index INTEGER NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      stem TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      points REAL NOT NULL DEFAULT 1,
      explanation TEXT,
      final_answer TEXT,
      explanation_steps TEXT,
      distractor_rationales TEXT,
      concept_summary TEXT,
      source TEXT NOT NULL DEFAULT 'generated',
      status TEXT NOT NULL DEFAULT 'draft',
      is_free INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS question_options (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS question_matches (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      left_content TEXT NOT NULL,
      correct_choice_index INTEGER NOT NULL,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS question_match_choices (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      choice_text TEXT NOT NULL,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS numeric_answers (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      correct_value REAL NOT NULL,
      tolerance REAL NOT NULL DEFAULT 0,
      accepted_expressions TEXT
    );

    CREATE TABLE IF NOT EXISTS papers (
      id TEXT PRIMARY KEY,
      exam_code TEXT NOT NULL,
      name TEXT NOT NULL,
      is_free INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS paper_questions (
      id TEXT PRIMARY KEY,
      paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id),
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'student',
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exam_id TEXT NOT NULL REFERENCES exams(id),
      mode TEXT NOT NULL,
      topic_id TEXT,
      paper_id TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      submitted_at TEXT,
      score REAL,
      total REAL,
      time_limit_seconds INTEGER
    );

    CREATE TABLE IF NOT EXISTS attempt_questions (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id),
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attempt_answers (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id),
      response TEXT,
      is_correct INTEGER,
      points_awarded REAL,
      saved_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS question_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id),
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
    CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id);
    CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
    CREATE INDEX IF NOT EXISTS idx_options_question ON question_options(question_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON attempt_answers(attempt_id);
  `);

  // Seed exams if empty
  const count = db.prepare("SELECT COUNT(*) as c FROM exams").get() as { c: number };
  if (count.c === 0) {
    const id = () => "e_" + Math.random().toString(36).slice(2, 10);
    db.prepare(
      "INSERT INTO exams (id, code, title, description, duration_minutes, total_questions) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id(), "AMP1", "AMP 1: Academic Mathematics Placement", "Basic high school mathematics. 60 multiple choice questions across 20 topic areas.", 120, 60);
    db.prepare(
      "INSERT INTO exams (id, code, title, description, duration_minutes, total_questions) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id(), "AMP2", "AMP 2: Advanced Mathematics Placement", "Advanced algebra, functions, and precalculus. 40 questions in 90 minutes.", 90, 40);
  }
}

export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
