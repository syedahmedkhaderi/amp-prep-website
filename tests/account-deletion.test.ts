import { describe, it, expect } from "vitest";
import { getDB, initDB } from "@/lib/db/sqlite";
import { deleteUserAndData } from "@/lib/account";
import { signUp, verifyPassword } from "@/lib/auth";

/**
 * The Privacy Policy tells users that deleting their account removes their
 * profile and every attempt and answer with it. These tests are what make that
 * sentence true rather than aspirational: an incomplete delete would leave
 * personal data behind while the site claimed otherwise.
 */

const rand = () => Math.random().toString(36).slice(2, 10);

/** A user with one attempt, one answered question, and one reported question. */
async function seedUserWithHistory() {
  initDB();
  const db = getDB();

  const email = `del_${rand()}@example.com`;
  const user = await signUp(email, "correct horse battery", "Delete Me");

  const examId = `exam_${rand()}`;
  const topicId = `topic_${rand()}`;
  const questionId = `q_${rand()}`;
  const attemptId = `att_${rand()}`;

  db.prepare(
    "INSERT INTO exams (id, code, title, description, duration_minutes, total_questions) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(examId, `D${rand().slice(0, 4)}`, "Exam", "Exam", 30, 1);
  db.prepare(
    "INSERT INTO topics (id, exam_id, name, slug, order_index, description) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(topicId, examId, "Topic", `${topicId}-slug`, 1, "Topic");
  db.prepare(
    `INSERT INTO questions
       (id, exam_id, topic_id, type, stem, difficulty, points, final_answer, explanation_steps, status, is_free)
       VALUES (?, ?, ?, 'single_mcq', 'What is $2+2$?', 'easy', 1, '4', ?, 'published', 1)`
  ).run(questionId, examId, topicId, JSON.stringify(["Add them."]));
  db.prepare(
    "INSERT INTO attempts (id, user_id, exam_id, mode, topic_id) VALUES (?, ?, ?, 'practice', ?)"
  ).run(attemptId, user.id, examId, topicId);
  db.prepare(
    "INSERT INTO attempt_questions (id, attempt_id, question_id, order_index) VALUES (?, ?, ?, 0)"
  ).run(`aq_${rand()}`, attemptId, questionId);
  db.prepare(
    "INSERT INTO attempt_answers (id, attempt_id, question_id, response, is_correct, points_awarded) VALUES (?, ?, ?, ?, 1, 1)"
  ).run(`ans_${rand()}`, attemptId, questionId, "4");

  return { user, attemptId, questionId, email };
}

function counts(userId: string, attemptId: string) {
  const db = getDB();
  const one = (sql: string, ...args: unknown[]) =>
    (db.prepare(sql).get(...args) as { n: number }).n;
  return {
    users: one("SELECT COUNT(*) AS n FROM users WHERE id = ?", userId),
    attempts: one("SELECT COUNT(*) AS n FROM attempts WHERE user_id = ?", userId),
    answers: one("SELECT COUNT(*) AS n FROM attempt_answers WHERE attempt_id = ?", attemptId),
    attemptQuestions: one(
      "SELECT COUNT(*) AS n FROM attempt_questions WHERE attempt_id = ?",
      attemptId
    ),
  };
}

describe("account deletion", () => {
  it("removes the user, their attempts, answers and attempt questions", async () => {
    const { user, attemptId } = await seedUserWithHistory();

    const before = counts(user.id, attemptId);
    expect(before).toEqual({ users: 1, attempts: 1, answers: 1, attemptQuestions: 1 });

    deleteUserAndData(user.id);

    expect(counts(user.id, attemptId)).toEqual({
      users: 0,
      attempts: 0,
      answers: 0,
      attemptQuestions: 0,
    });
  });

  it("reports what it deleted", async () => {
    const { user } = await seedUserWithHistory();
    const result = deleteUserAndData(user.id);
    expect(result.attempts).toBe(1);
    expect(result.answers).toBe(1);
  });

  it("leaves other users' data untouched", async () => {
    const victim = await seedUserWithHistory();
    const bystander = await seedUserWithHistory();

    deleteUserAndData(victim.user.id);

    expect(counts(bystander.user.id, bystander.attemptId)).toEqual({
      users: 1,
      attempts: 1,
      answers: 1,
      attemptQuestions: 1,
    });
  });

  it("frees the email address for re-registration", async () => {
    const { user, email } = await seedUserWithHistory();
    deleteUserAndData(user.id);

    // Signing up again must not collide with the deleted row.
    const reused = await signUp(email, "a different password", "New Person");
    expect(reused.email).toBe(email);
    expect(reused.id).not.toBe(user.id);
  });

  it("is a no-op for an unknown user rather than an error", () => {
    expect(() => deleteUserAndData("u_does_not_exist")).not.toThrow();
  });
});

describe("password re-confirmation", () => {
  it("accepts the correct password and rejects everything else", async () => {
    const { user } = await seedUserWithHistory();

    expect(await verifyPassword(user.id, "correct horse battery")).toBe(true);
    expect(await verifyPassword(user.id, "wrong")).toBe(false);
    expect(await verifyPassword(user.id, "")).toBe(false);
  });

  it("rejects a password check against a deleted user", async () => {
    const { user } = await seedUserWithHistory();
    deleteUserAndData(user.id);
    expect(await verifyPassword(user.id, "correct horse battery")).toBe(false);
  });
});
