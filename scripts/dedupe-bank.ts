import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";

loadScriptsEnv();

/**
 * Retire questions that duplicate another question's shape AND its answer.
 *
 * The generator produced a fixed quota per topic with no check that the items
 * inside differed, so it wrote six Factoring questions that all answer 5, three
 * of them on the identical polynomial. A student who does one learns nothing
 * from the other five, and a mock paper drawing several of them is shorter than
 * it looks.
 *
 * Only the strongest signal is acted on: same topic, same stem archetype, and
 * the same answer. Two questions sharing a template but reaching different
 * answers are legitimate practice at the same skill and are left alone. Within
 * a group the questions are kept in id order and the surplus is retired, which
 * is arbitrary but stable, so re-running produces the same result.
 *
 * Retired rather than deleted: attempt_answers rows point at these ids, and
 * deleting them would break a student's past attempt history. `retired` is not
 * `published`, so lib/db/queries.ts stops serving them.
 *
 *   npx tsx scripts/dedupe-bank.ts             # report only
 *   npx tsx scripts/dedupe-bank.ts --write
 */

const QUESTIONS_PATH = path.resolve(process.cwd(), "data/generated/questions.json");

/** How many questions of one archetype-and-answer group are worth keeping. */
const KEEP_PER_GROUP = 1;

function archetype(stem: string): string {
  return stem
    .replace(/\$\$[^$]*\$\$/g, " M ")
    .replace(/\$[^$]*\$/g, " M ")
    .replace(/[0-9]+/g, "#")
    .replace(/[^a-zA-Z# ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .slice(0, 9)
    .join(" ");
}

function answerKey(q: any): string | null {
  if (q.type === "numeric" && q.numeric_answer && typeof q.numeric_answer.value === "number") {
    return `num:${q.numeric_answer.value}`;
  }
  const correct = (q.options ?? [])
    .filter((o: any) => o && o.is_correct && typeof o.content === "string")
    .map((o: any) => o.content.replace(/\$/g, "").replace(/\s+/g, "").toLowerCase());
  if (correct.length > 0) return `opt:${correct.sort().join("|")}`;
  if (typeof q.final_answer === "string") return `fin:${q.final_answer.replace(/\s+/g, "").toLowerCase()}`;
  return null;
}

function main() {
  const write = process.argv.includes("--write");
  const raw = fs.readFileSync(QUESTIONS_PATH, "utf-8");
  const questions = JSON.parse(raw) as any[];

  const groups = new Map<string, any[]>();
  for (const q of questions) {
    if (q.status === "needs_review" || q.status === "retired") continue;
    const key = answerKey(q);
    if (key === null) continue;
    const composite = `${q.topic_slug}::${archetype(q.stem ?? "")}::${key}`;
    const bucket = groups.get(composite);
    if (bucket) bucket.push(q);
    else groups.set(composite, [q]);
  }

  const duplicated = [...groups.entries()].filter(([, v]) => v.length > KEEP_PER_GROUP);
  duplicated.sort((a, b) => b[1].length - a[1].length);

  const toRetire: any[] = [];
  for (const [, group] of duplicated) {
    const ordered = [...group].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    toRetire.push(...ordered.slice(KEEP_PER_GROUP));
  }

  console.log(`[dedupe] ${duplicated.length} group(s) share a shape and an answer`);
  console.log(`[dedupe] ${toRetire.length} question(s) would be retired`);
  console.log(`[dedupe] largest groups:`);
  for (const [key, group] of duplicated.slice(0, 10)) {
    const [topic] = key.split("::");
    console.log(`  ${String(group.length).padStart(2)}x  ${topic.padEnd(38)} ${group[0].stem.slice(0, 60).replace(/\s+/g, " ")}`);
  }

  // Per-topic impact, so a topic is not gutted without it being visible.
  const impact = new Map<string, { retired: number; remaining: number }>();
  for (const q of questions) {
    if (q.status === "needs_review") continue;
    const row = impact.get(q.topic_slug) ?? { retired: 0, remaining: 0 };
    row.remaining++;
    impact.set(q.topic_slug, row);
  }
  for (const q of toRetire) {
    const row = impact.get(q.topic_slug)!;
    row.retired++;
    row.remaining--;
  }
  console.log(`\n[dedupe] topics losing the most:`);
  for (const [slug, r] of [...impact.entries()].sort((a, b) => b[1].retired - a[1].retired).slice(0, 8)) {
    if (r.retired === 0) continue;
    console.log(`  ${slug.padEnd(38)} -${String(r.retired).padStart(3)}  leaving ${r.remaining}`);
  }

  if (!write) {
    console.log("\n[dedupe] Report only. Re-run with --write to retire them.");
    return;
  }

  const ids = new Set(toRetire.map((q) => q.id));
  for (const q of questions) if (ids.has(q.id)) q.status = "retired";

  const snapshot = `${QUESTIONS_PATH}.pre-dedupe-backup`;
  if (!fs.existsSync(snapshot)) fs.writeFileSync(snapshot, raw);
  fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(questions, null, 2) + "\n");
  console.log(`\n[dedupe] Retired ${ids.size} question(s). Run \`npm run seed && npm run assemble\`.`);
}

if (require.main === module) main();
