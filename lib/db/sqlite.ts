/**
 * Database layer using SQLite (better-sqlite3) for local, self-contained
 * operation.
 *
 * This is the production data layer, not only a development one: the site runs
 * on a single instance with the database on a persistent volume. The Postgres
 * schema in supabase/migrations mirrors it and is the documented scale-out
 * path, but no application code reads it today. See DEPLOYMENT.md.
 */

import Database from "better-sqlite3";
import type { Database as DBType } from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

/**
 * Where the database file lives.
 *
 * AMP_DB_PATH exists so a process can be pointed at a different file. The unit
 * suite uses it: without it, running `npm test` writes its fixtures into the
 * real database, and it had done exactly that — the development database had
 * accumulated 105 orphan topic rows from test runs, enough that a dashboard
 * gauge reported progress against a denominator no student could reach.
 *
 * The default stays relative to the working directory, so a host that starts
 * the process from somewhere other than the project root gets a different, and
 * empty, database. See DEPLOYMENT.md.
 */
const DB_PATH = process.env.AMP_DB_PATH
  ? path.resolve(process.env.AMP_DB_PATH)
  : path.resolve(process.cwd(), "data/amp-prep.db");

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

    -- Password reset tokens.
    --
    -- token_hash, never the token: a leaked database must not hand over working
    -- reset links for every account, which is the same reason password_hash
    -- exists rather than a password column.
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    CREATE INDEX IF NOT EXISTS idx_questions_status_topic ON questions(status, topic_id, difficulty, created_at);
    CREATE INDEX IF NOT EXISTS idx_questions_status_exam_free ON questions(status, exam_id, is_free, difficulty, created_at);
    CREATE INDEX IF NOT EXISTS idx_options_question ON question_options(question_id);
    CREATE INDEX IF NOT EXISTS idx_matches_question ON question_matches(question_id);
    CREATE INDEX IF NOT EXISTS idx_match_choices_question ON question_match_choices(question_id);
    CREATE INDEX IF NOT EXISTS idx_numeric_answers_question ON numeric_answers(question_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_user_mode_started ON attempts(user_id, mode, started_at);
    CREATE INDEX IF NOT EXISTS idx_attempt_questions_attempt_order ON attempt_questions(attempt_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_attempt_questions_attempt_question ON attempt_questions(attempt_id, question_id);
    CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON attempt_answers(attempt_id);
    CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_question ON attempt_answers(attempt_id, question_id);
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_expiry ON password_reset_tokens(expires_at);
  `);

  runColumnMigrations(db);

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

/**
 * Add columns to tables that already exist.
 *
 * The schema above is all `CREATE TABLE IF NOT EXISTS`, which does nothing to a
 * database that was created before a column was introduced. Any new column on
 * an existing table has to be added here, or it will exist on fresh installs
 * and be silently missing everywhere else.
 */
function runColumnMigrations(db: DBType): void {
  const addColumn = (table: string, column: string, definition: string): void => {
    const columns = db.pragma(`table_info(${table})`) as { name: string }[];
    if (columns.some((c) => c.name === column)) return;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  };

  // Bumped whenever a user's credentials change, and carried in the session
  // token. A token minted before the bump no longer matches and is rejected,
  // which is what makes "change your password" actually end other sessions.
  addColumn("users", "token_version", "INTEGER NOT NULL DEFAULT 0");
}

export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
