import { loadScriptsEnv } from "./lib/env";

loadScriptsEnv();

import { initDB, getDB } from "../lib/db/sqlite";
import { allLessons } from "../data/lessons";

/**
 * Load the authored lessons into the lessons table.
 *
 * Idempotent and keyed by slug, so re-running updates a lesson in place and
 * leaves a student's lesson_progress row pointing at it. Rebuilding the row
 * with a new id would silently reset everyone's progress.
 *
 *   npx tsx scripts/seed-lessons.ts
 */

function slugForSkill(skillSlug: string): string {
  return skillSlug;
}

function main() {
  initDB();
  const db = getDB();

  const skillRows = db.prepare("SELECT id, slug, order_index FROM skills").all() as {
    id: string;
    slug: string;
    order_index: number;
  }[];
  const skillBySlug = new Map(skillRows.map((r) => [r.slug, r]));

  if (skillBySlug.size === 0) {
    console.error("[lessons] No skills in the database. Run `npm run seed:skills` first.");
    process.exit(1);
  }

  const upsert = db.prepare(
    `INSERT INTO lessons (id, skill_id, title, slug, order_index, summary, blocks, est_minutes, status, is_free)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', 1)
     ON CONFLICT(slug) DO UPDATE SET
       skill_id = excluded.skill_id,
       title = excluded.title,
       order_index = excluded.order_index,
       summary = excluded.summary,
       blocks = excluded.blocks,
       est_minutes = excluded.est_minutes,
       status = excluded.status`
  );

  let written = 0;
  const unknown: string[] = [];

  const run = db.transaction(() => {
    for (const lesson of allLessons) {
      const skill = skillBySlug.get(lesson.skillSlug);
      if (!skill) {
        unknown.push(lesson.skillSlug);
        continue;
      }
      upsert.run(
        "lsn_" + lesson.skillSlug,
        skill.id,
        lesson.title,
        slugForSkill(lesson.skillSlug),
        skill.order_index,
        lesson.summary,
        JSON.stringify(lesson.blocks),
        lesson.estMinutes
      );
      written++;
    }
  });
  run();

  if (unknown.length > 0) {
    console.error(`[lessons] ${unknown.length} lesson(s) target a skill that does not exist:`);
    for (const slug of unknown) console.error(`  ${slug}`);
    process.exit(1);
  }

  const total = (db.prepare("SELECT COUNT(*) AS c FROM lessons WHERE status = 'published'").get() as { c: number }).c;
  const skills = (db.prepare("SELECT COUNT(*) AS c FROM skills").get() as { c: number }).c;
  console.log(`[lessons] Upserted ${written}. ${total} published lesson(s) covering ${total}/${skills} skills.`);

  const byTopic = db.prepare(
    `SELECT t.slug, COUNT(*) AS c FROM lessons l
     JOIN skills s ON s.id = l.skill_id
     JOIN topics t ON t.id = s.topic_id
     WHERE l.status = 'published'
     GROUP BY t.slug ORDER BY c DESC`
  ).all();
  console.log(`[lessons] By topic: ${JSON.stringify(byTopic)}`);
}

if (require.main === module) main();
