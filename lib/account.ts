import { getDB, initDB } from "@/lib/db/sqlite";

/**
 * Erase a user and everything recorded against them.
 *
 * Kept apart from the server action so the destructive part can be tested
 * directly: the action owns authentication, the password re-check, the session
 * cookie and the redirect, none of which run outside a request. What the
 * Privacy Policy actually promises is this function.
 *
 * Rows are removed explicitly inside a transaction rather than relying on
 * ON DELETE CASCADE. The cascade is declared in the schema, but it only fires
 * while the `foreign_keys` pragma is on, and that is set per connection. A
 * deletion that silently orphaned a user's answers would leave behind exactly
 * the data the policy said had been removed.
 *
 * Returns what was deleted, so a caller can log or display it.
 */
export function deleteUserAndData(userId: string): {
  attempts: number;
  answers: number;
  reports: number;
} {
  initDB();
  const db = getDB();

  return db.transaction(() => {
    const attemptIds = db
      .prepare("SELECT id FROM attempts WHERE user_id = ?")
      .all(userId)
      .map((row: any) => row.id as string);

    let answers = 0;
    for (const attemptId of attemptIds) {
      answers += db
        .prepare("DELETE FROM attempt_answers WHERE attempt_id = ?")
        .run(attemptId).changes;
      db.prepare("DELETE FROM attempt_questions WHERE attempt_id = ?").run(attemptId);
    }

    const attempts = db.prepare("DELETE FROM attempts WHERE user_id = ?").run(userId).changes;
    const reports = db
      .prepare("DELETE FROM question_reports WHERE user_id = ?")
      .run(userId).changes;
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);

    return { attempts, answers, reports };
  })();
}
