import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";
import { initDB, getDB } from "../lib/db/sqlite";

loadScriptsEnv();

/**
 * Load data/generated/skills.json into the skills table.
 *
 * Idempotent and keyed by slug, so it can run after scripts/seed.ts without
 * disturbing lessons that already point at a skill. seed.ts deletes and
 * rebuilds the questions table wholesale; skills deliberately do not work that
 * way, because a lesson holds a foreign key to one and rebuilding the row would
 * orphan it.
 *
 *   npx tsx scripts/seed-skills.ts
 */

const SKILLS_PATH = path.resolve(process.cwd(), "data/generated/skills.json");

interface SkillRecord {
  topicSlug: string;
  exam: string;
  name: string;
  slug: string;
  orderIndex: number;
  objective: string;
  source: string;
}

function main() {
  if (!fs.existsSync(SKILLS_PATH)) {
    console.error("[skills] skills.json not found. Run `npx tsx scripts/build-skills.ts` first.");
    process.exit(1);
  }

  initDB();
  const db = getDB();

  const file = JSON.parse(fs.readFileSync(SKILLS_PATH, "utf-8"));
  const skills: SkillRecord[] = file.skills;

  const topicIdBySlug = new Map<string, string>();
  for (const row of db.prepare("SELECT id, slug FROM topics").all() as { id: string; slug: string }[]) {
    topicIdBySlug.set(row.slug, row.id);
  }
  if (topicIdBySlug.size === 0) {
    console.error("[skills] No topics in the database. Run `npm run seed` first.");
    process.exit(1);
  }

  const upsert = db.prepare(
    `INSERT INTO skills (id, topic_id, name, slug, order_index, objective, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       topic_id = excluded.topic_id,
       name = excluded.name,
       order_index = excluded.order_index,
       objective = excluded.objective,
       source = excluded.source`
  );

  let written = 0;
  const unknownTopics: string[] = [];

  const run = db.transaction(() => {
    for (const s of skills) {
      const topicId = topicIdBySlug.get(s.topicSlug);
      if (!topicId) {
        unknownTopics.push(s.topicSlug);
        continue;
      }
      upsert.run("skl_" + s.slug, topicId, s.name, s.slug, s.orderIndex, s.objective, s.source);
      written++;
    }
  });
  run();

  if (unknownTopics.length > 0) {
    console.warn(`[skills] Skipped ${unknownTopics.length} skill(s) with unknown topics: ${[...new Set(unknownTopics)].join(", ")}`);
  }

  const total = (db.prepare("SELECT COUNT(*) AS c FROM skills").get() as { c: number }).c;
  const bySource = db.prepare("SELECT source, COUNT(*) AS c FROM skills GROUP BY source").all();
  console.log(`[skills] Upserted ${written} skill(s). Table now holds ${total}.`);
  console.log(`[skills] By source: ${JSON.stringify(bySource)}`);

  // Questions are deliberately left unlabelled rather than guessed at. The
  // generator recorded only a topic, and inferring an objective from stem text
  // would mislabel enough of the bank to make skill-level analytics lie. The
  // regeneration pass records skill_id at authoring time instead.
  const labelled = (db.prepare("SELECT COUNT(*) AS c FROM questions WHERE skill_id IS NOT NULL").get() as { c: number }).c;
  const totalQ = (db.prepare("SELECT COUNT(*) AS c FROM questions").get() as { c: number }).c;
  console.log(`[skills] questions.skill_id coverage: ${labelled}/${totalQ}`);
}

if (require.main === module) main();
