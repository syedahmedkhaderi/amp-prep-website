import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";

loadScriptsEnv();

import Database from "better-sqlite3";
import { allLessons } from "../data/lessons";

/**
 * Repoint lesson checkpoints at questions that are still served.
 *
 * A lesson names its check-your-understanding questions by id. The repair and
 * de-duplication passes move questions out of the published pool, and a
 * checkpoint pointing at one of those silently renders nothing: the lesson ends
 * with an empty box where the practice should be.
 *
 * Rather than edit the lesson files by hand every time the bank changes, this
 * finds a replacement from the same topic at the same difficulty, preferring a
 * question no other lesson is already using. It prints the substitutions as
 * ready-to-paste edits instead of rewriting the .ts sources, because a lesson
 * is authored content and a script that rewrites prose files is harder to
 * review than a list of two-line changes.
 *
 *   npx tsx scripts/repair-checkpoints.ts
 */

const DB_PATH = path.resolve(process.cwd(), "data/amp-prep.db");

function main() {
  const db = new Database(DB_PATH, { readonly: true });

  const published = db
    .prepare(
      `SELECT q.id, q.difficulty, q.type, t.slug AS topic_slug
       FROM questions q JOIN topics t ON t.id = q.topic_id
       WHERE q.status = 'published' AND q.type IN ('single_mcq','numeric')`
    )
    .all() as { id: string; difficulty: string; type: string; topic_slug: string }[];

  const byId = new Map(published.map((q) => [q.id, q]));
  const byTopic = new Map<string, typeof published>();
  for (const q of published) {
    const b = byTopic.get(q.topic_slug);
    if (b) b.push(q);
    else byTopic.set(q.topic_slug, [q]);
  }

  // Ids already spoken for, so a replacement does not collide with a
  // checkpoint in a neighbouring lesson.
  const inUse = new Set<string>();
  for (const lesson of allLessons) {
    for (const b of lesson.blocks) {
      if (b.type === "checkpoint") for (const id of b.questionIds) inUse.add(id);
    }
  }

  // Topic for each lesson, taken from the skill slug's prefix.
  const skills = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), "data/generated/skills.json"), "utf-8")
  ).skills as { slug: string; topicSlug: string }[];
  const topicBySkill = new Map(skills.map((s) => [s.slug, s.topicSlug]));

  const fixes: { lesson: string; from: string; to: string; file: string }[] = [];

  for (const lesson of allLessons) {
    const topicSlug = topicBySkill.get(lesson.skillSlug);
    if (!topicSlug) continue;

    for (const block of lesson.blocks) {
      if (block.type !== "checkpoint") continue;
      for (const id of block.questionIds) {
        if (byId.has(id)) continue;

        const pool = (byTopic.get(topicSlug) ?? []).filter((q) => !inUse.has(q.id));
        // Prefer an easy or medium single_mcq: a checkpoint is a confidence
        // check at the end of a lesson, not the hardest item in the topic.
        const preferred =
          pool.find((q) => q.type === "single_mcq" && q.difficulty === "easy") ??
          pool.find((q) => q.type === "single_mcq" && q.difficulty === "medium") ??
          pool.find((q) => q.type === "single_mcq") ??
          pool[0];

        if (!preferred) {
          console.error(`[checkpoints] ${lesson.skillSlug}: no replacement available in ${topicSlug}`);
          continue;
        }
        inUse.add(preferred.id);
        fixes.push({ lesson: lesson.skillSlug, from: id, to: preferred.id, file: topicSlug });
      }
    }
  }

  db.close();

  if (fixes.length === 0) {
    console.log("[checkpoints] Every checkpoint points at a published question.");
    return;
  }

  console.log(`[checkpoints] ${fixes.length} checkpoint(s) point at a question no longer served.\n`);
  for (const f of fixes) {
    console.log(`  ${f.lesson}`);
    console.log(`    replace  "${f.from}"  with  "${f.to}"`);
  }
  console.log(`\n[checkpoints] Apply with: npx tsx scripts/repair-checkpoints.ts --write`);

  if (process.argv.includes("--write")) {
    const dir = path.resolve(process.cwd(), "data/lessons");
    let edited = 0;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
      const full = path.join(dir, file);
      let text = fs.readFileSync(full, "utf-8");
      const before = text;
      for (const f of fixes) text = text.replaceAll(`"${f.from}"`, `"${f.to}"`);
      if (text !== before) {
        fs.writeFileSync(full, text);
        edited++;
      }
    }
    console.log(`[checkpoints] Rewrote ${edited} lesson file(s).`);
  }
}

if (require.main === module) main();
