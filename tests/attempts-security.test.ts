import { getDB, initDB } from "@/lib/db/sqlite";
import { saveAnswer } from "@/lib/attempts";

const ids: string[] = [];
const id = (prefix: string) => {
  const value = `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  ids.push(value);
  return value;
};

function seedAttempt(mode: "practice" | "mock") {
  initDB();
  const db = getDB();
  const examId = id("exam");
  const topicId = id("topic");
  const questionId = id("question");
  const optionA = id("option");
  const optionB = id("option");
  const attemptId = id("attempt");
  const ownerId = id("user");
  const otherUserId = id("user");

  db.prepare(
    "INSERT INTO exams (id, code, title, description, duration_minutes, total_questions) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(examId, `T${ids.length}`, "Test exam", "Test exam", 30, 1);
  db.prepare(
    "INSERT INTO topics (id, exam_id, name, slug, order_index, description) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(topicId, examId, "Test topic", `${topicId}-slug`, 1, "Test topic");
  db.prepare(
    `INSERT INTO questions
      (id, exam_id, topic_id, type, stem, difficulty, points, final_answer, explanation_steps, status, is_free)
      VALUES (?, ?, ?, 'single_mcq', 'What is $2+2$?', 'easy', 1, '4', ?, 'published', 1)`
  ).run(questionId, examId, topicId, JSON.stringify(["Add the two numbers."]));
  db.prepare(
    "INSERT INTO question_options (id, question_id, content, is_correct, order_index) VALUES (?, ?, ?, ?, ?)"
  ).run(optionA, questionId, "3", 0, 0);
  db.prepare(
    "INSERT INTO question_options (id, question_id, content, is_correct, order_index) VALUES (?, ?, ?, ?, ?)"
  ).run(optionB, questionId, "4", 1, 1);
  db.prepare(
    "INSERT INTO users (id, email, password_hash, full_name, role, plan) VALUES (?, ?, 'hash', 'Owner', 'student', 'free')"
  ).run(ownerId, `${ownerId}@example.com`);
  db.prepare(
    "INSERT INTO users (id, email, password_hash, full_name, role, plan) VALUES (?, ?, 'hash', 'Other', 'student', 'free')"
  ).run(otherUserId, `${otherUserId}@example.com`);
  db.prepare(
    "INSERT INTO attempts (id, user_id, exam_id, mode, topic_id, total, time_limit_seconds) VALUES (?, ?, ?, ?, ?, 1, ?)"
  ).run(attemptId, ownerId, examId, mode, topicId, mode === "mock" ? 1800 : null);
  db.prepare(
    "INSERT INTO attempt_questions (id, attempt_id, question_id, order_index) VALUES (?, ?, ?, 0)"
  ).run(id("aq"), attemptId, questionId);

  return { attemptId, ownerId, otherUserId, questionId, optionB };
}

afterEach(() => {
  const db = getDB();
  for (const table of [
    "attempt_answers",
    "attempt_questions",
    "attempts",
    "question_options",
    "questions",
    "topics",
    "exams",
    "users",
  ]) {
    const placeholders = ids.map(() => "?").join(",");
    if (placeholders) {
      db.prepare(`DELETE FROM ${table} WHERE id IN (${placeholders})`).run(...ids);
    }
  }
  ids.length = 0;
});

describe("Attempt answer security", () => {
  test("rejects saving an answer for another user's attempt", () => {
    const seeded = seedAttempt("practice");

    expect(() =>
      saveAnswer(seeded.attemptId, seeded.questionId, { optionId: seeded.optionB }, seeded.otherUserId)
    ).toThrow("Forbidden.");
  });

  test("does not return practice feedback for mock attempts", () => {
    const seeded = seedAttempt("mock");

    const result = saveAnswer(seeded.attemptId, seeded.questionId, { optionId: seeded.optionB }, seeded.ownerId);

    expect(result.saved).toBe(1);
    expect(result.feedback).toBeUndefined();
  });

  test("returns feedback only for practice attempts owned by the user", () => {
    const seeded = seedAttempt("practice");

    const result = saveAnswer(seeded.attemptId, seeded.questionId, { optionId: seeded.optionB }, seeded.ownerId);

    expect(result.saved).toBe(1);
    expect(result.feedback?.isCorrect).toBe(true);
  });
});
