import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";

loadScriptsEnv();

import Database from "better-sqlite3";

/**
 * Export a batch of published questions for independent answer-key checking.
 *
 * The bank's keys have never been checked by a person. seed.ts records its own
 * 30-question audit at a 6.7 percent wrong-key rate, which is roughly 230 wrong
 * answers in the published set.
 *
 * The export deliberately includes the claimed answer. Hiding it would be
 * pointless — the checker can always look it up — and the instruction that
 * actually matters is procedural: solve first, compare second. That is stated
 * in the header of every batch.
 *
 *   npx tsx scripts/export-verify-batch.ts --offset 0 --limit 50
 *   npx tsx scripts/export-verify-batch.ts --topic factoring --limit 40
 *   npx tsx scripts/export-verify-batch.ts --exam AMP2 --limit 50 --out batch.txt
 */

const DB_PATH = path.resolve(process.cwd(), "data/amp-prep.db");

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function main() {
  const offset = Number(arg("offset", "0"));
  const limit = Number(arg("limit", "50"));
  const topic = arg("topic");
  const exam = arg("exam");
  const out = arg("out");

  const db = new Database(DB_PATH, { readonly: true });

  const where: string[] = ["q.status = 'published'"];
  const params: any[] = [];
  if (topic) {
    where.push("t.slug = ?");
    params.push(topic);
  }
  if (exam) {
    where.push("e.code = ?");
    params.push(exam.toUpperCase());
  }

  const rows = db.prepare(
    `SELECT q.id, q.type, q.difficulty, q.stem, q.final_answer, t.slug AS topic, e.code AS exam
     FROM questions q
     JOIN topics t ON t.id = q.topic_id
     JOIN exams e ON e.id = t.exam_id
     WHERE ${where.join(" AND ")}
     ORDER BY t.order_index, q.id
     LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as any[];

  const optionsFor = db.prepare(
    "SELECT content, is_correct FROM question_options WHERE question_id = ? ORDER BY order_index"
  );
  const numericFor = db.prepare(
    "SELECT correct_value, tolerance, accepted_expressions FROM numeric_answers WHERE question_id = ?"
  );
  const matchChoicesFor = db.prepare(
    "SELECT choice_text FROM question_match_choices WHERE question_id = ? ORDER BY order_index"
  );
  const matchesFor = db.prepare(
    "SELECT left_content, correct_choice_index FROM question_matches WHERE question_id = ? ORDER BY order_index"
  );

  const L: string[] = [];
  L.push("=".repeat(78));
  L.push("ANSWER KEY VERIFICATION BATCH");
  L.push(`${rows.length} questions, offset ${offset}${topic ? `, topic ${topic}` : ""}${exam ? `, exam ${exam}` : ""}`);
  L.push("=".repeat(78));
  L.push("");
  L.push("For each question below:");
  L.push("");
  L.push("  1. Solve it yourself, from scratch, WITHOUT reading the claimed");
  L.push("     answer. Work it fully before you look.");
  L.push("  2. Then compare your result with the claimed answer.");
  L.push("  3. If they disagree, say so plainly. Do not reason backwards from");
  L.push("     the claimed answer to justify it.");
  L.push("");
  L.push("Reading the answer first produces agreement with whatever is already");
  L.push("there. That is worse than not checking at all, because it looks like");
  L.push("verification and is not.");
  L.push("");
  L.push("Reply with one JSON object per line, nothing else:");
  L.push("");
  L.push('  {"id":"q_abc123","agrees":true}');
  L.push('  {"id":"q_def456","agrees":false,"correct_answer":"11/18","why":"the');
  L.push('   third step drops a factor of 2"}');
  L.push("");
  L.push("Flag a question as disagreeing if the key is wrong, if more than one");
  L.push("option is correct, if no option is correct, or if the question cannot");
  L.push("be answered as written.");
  L.push("");
  L.push("=".repeat(78));
  L.push("");

  for (const [i, q] of rows.entries()) {
    L.push(`--- ${i + 1} of ${rows.length} --- ${q.id}  [${q.exam} / ${q.topic} / ${q.type} / ${q.difficulty}]`);
    L.push("");
    L.push(q.stem);
    L.push("");

    if (q.type === "matching") {
      // A matching question is unanswerable without both columns, and the
      // left column lives in its own table.
      const choices = matchChoicesFor.all(q.id) as any[];
      const pairs = matchesFor.all(q.id) as any[];
      L.push("  CHOICES:");
      choices.forEach((c, j) => L.push(`    ${j}. ${c.choice_text}`));
      L.push("");
      L.push("  ITEMS AND CLAIMED MATCHES:");
      pairs.forEach((m) => {
        const chosen = choices[m.correct_choice_index];
        L.push(`    ${m.left_content}   -->   [${m.correct_choice_index}] ${chosen ? chosen.choice_text : "INDEX OUT OF RANGE"}`);
      });
      L.push("");
    } else if (q.type !== "numeric") {
      const options = optionsFor.all(q.id) as any[];
      options.forEach((o, j) => {
        L.push(`  ${String.fromCharCode(65 + j)}. ${o.content}${o.is_correct ? "      <-- CLAIMED CORRECT" : ""}`);
      });
      L.push("");
    } else {
      const na = numericFor.get(q.id) as any;
      if (na) {
        let accepted: string[] = [];
        try {
          accepted = JSON.parse(na.accepted_expressions || "[]");
        } catch {
          accepted = [];
        }
        L.push(`  CLAIMED ANSWER: ${na.correct_value}  (tolerance ${na.tolerance})`);
        if (accepted.length > 0) L.push(`  also accepted: ${accepted.join(", ")}`);
        L.push("");
      }
    }

    if (q.final_answer) L.push(`  stated answer: ${q.final_answer}`);
    L.push("");
  }

  const text = L.join("\n") + "\n";
  if (out) {
    fs.writeFileSync(path.resolve(process.cwd(), out), text);
    console.log(`[verify-batch] Wrote ${rows.length} questions to ${out}`);
  } else {
    process.stdout.write(text);
  }

  const total = db.prepare(`SELECT COUNT(*) AS c FROM questions q JOIN topics t ON t.id = q.topic_id JOIN exams e ON e.id = t.exam_id WHERE ${where.join(" AND ")}`).get(...params) as any;
  console.error(`[verify-batch] ${offset + rows.length} of ${total.c} covered. Next: --offset ${offset + rows.length}`);
  db.close();
}

if (require.main === module) main();
