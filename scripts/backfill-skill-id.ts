/**
 * Backfills questions.json[].skill_id from data/generated/skills.json.
 *
 * There is no LLM classification pass available here (no ANTHROPIC_API_KEY
 * configured in this environment), so this uses a deterministic keyword-
 * overlap scorer instead: for each question, score it against every skill in
 * its own topic using IDF-weighted word overlap between the skill's
 * objective/name and the question's stem + concept summary. IDF is computed
 * within the topic's own skill list, so instructional verbs shared by most
 * skills in a topic ("use", "determine", "calculate") are automatically
 * down-weighted, while distinguishing terms ("reciprocal", "cotangent",
 * "difference of squares") dominate the score.
 *
 * lib/types.ts documents the intended contract: "Set only where the question
 * maps unambiguously to one objective." This script honors that by only
 * assigning skill_id when the top-scoring skill clears both an absolute
 * floor and a margin over the runner-up; otherwise it leaves skill_id unset
 * rather than guessing.
 *
 * Run with --write to persist; otherwise it only reports coverage.
 */

import * as fs from "fs";
import * as path from "path";

const QUESTIONS_PATH = path.resolve(__dirname, "../data/generated/questions.json");
const SKILLS_PATH = path.resolve(__dirname, "../data/generated/skills.json");

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "and", "or", "in", "on", "for", "with", "is", "are",
  "that", "this", "its", "when", "given", "between", "by", "from", "as", "be", "at",
  "each", "which", "into", "than", "then", "over", "their", "your", "you", "using",
  "based", "provide", "consider", "following", "value", "values", "let", "if",
]);

function tokenize(text: string): string[] {
  const stripped = text
    .replace(/\\[a-zA-Z]+/g, " ") // drop LaTeX commands (\frac, \sqrt, ...)
    .replace(/[{}$^_\\]/g, " ")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .toLowerCase();
  return stripped
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

interface SkillEntry {
  id: string;
  topicSlug: string;
  name: string;
  objective: string;
  orderIndex: number;
  words: Map<string, number>; // term frequency
}

function buildSkillEntries(): Map<string, SkillEntry[]> {
  const raw = JSON.parse(fs.readFileSync(SKILLS_PATH, "utf-8"));
  const byTopic = new Map<string, SkillEntry[]>();
  for (const s of raw.skills) {
    const words = new Map<string, number>();
    for (const w of tokenize(`${s.name} ${s.objective}`)) {
      words.set(w, (words.get(w) || 0) + 1);
    }
    const entry: SkillEntry = {
      id: "skl_" + s.slug,
      topicSlug: s.topicSlug,
      name: s.name,
      objective: s.objective,
      orderIndex: s.orderIndex,
      words,
    };
    const list = byTopic.get(s.topicSlug) || [];
    list.push(entry);
    byTopic.set(s.topicSlug, list);
  }
  return byTopic;
}

function idfByTopic(skills: SkillEntry[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const s of skills) {
    for (const w of s.words.keys()) {
      df.set(w, (df.get(w) || 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  const n = skills.length;
  for (const [w, count] of df) {
    idf.set(w, Math.log((n + 1) / count));
  }
  return idf;
}

// Minimum absolute score and minimum ratio over the runner-up before we're
// willing to call a match "unambiguous."
const MIN_SCORE = 1.0;
const MIN_MARGIN_RATIO = 1.25;

function classify(
  questionWords: string[],
  skills: SkillEntry[],
  idf: Map<string, number>
): SkillEntry | null {
  const qset = new Set(questionWords);
  const scored = skills
    .map((s) => {
      let score = 0;
      for (const w of s.words.keys()) {
        if (qset.has(w)) score += idf.get(w) || 0;
      }
      return { s, score };
    })
    .sort((a, b) => b.score - a.score || a.s.orderIndex - b.s.orderIndex);

  const top = scored[0];
  const second = scored[1];
  if (!top || top.score < MIN_SCORE) return null;
  if (second && second.score > 0 && top.score / second.score < MIN_MARGIN_RATIO) return null;
  return top.s;
}

function main() {
  const write = process.argv.includes("--write");
  const questions = JSON.parse(fs.readFileSync(QUESTIONS_PATH, "utf-8"));
  const skillsByTopic = buildSkillEntries();
  const idfByTopicSlug = new Map<string, Map<string, number>>();
  for (const [topicSlug, skills] of skillsByTopic) {
    idfByTopicSlug.set(topicSlug, idfByTopic(skills));
  }

  let assigned = 0;
  let skippedNoSkills = 0;
  let left = 0;
  const perTopicCoverage: Record<string, { total: number; assigned: number }> = {};

  for (const q of questions) {
    if (q.status === "retired") continue;
    const skills = skillsByTopic.get(q.topic_slug);
    if (!skills) {
      skippedNoSkills++;
      continue;
    }
    perTopicCoverage[q.topic_slug] = perTopicCoverage[q.topic_slug] || { total: 0, assigned: 0 };
    perTopicCoverage[q.topic_slug].total++;

    const text = [q.stem, q.concept_summary || "", (q.explanation_steps || []).join(" ")].join(" ");
    const words = tokenize(text);
    const idf = idfByTopicSlug.get(q.topic_slug)!;
    const match = classify(words, skills, idf);

    if (match) {
      q.skill_id = match.id;
      assigned++;
      perTopicCoverage[q.topic_slug].assigned++;
    } else {
      left++;
    }
  }

  console.log(`[skill-backfill] ${questions.length} questions loaded`);
  console.log(`[skill-backfill] assigned: ${assigned}`);
  console.log(`[skill-backfill] left unassigned (no confident match): ${left}`);
  console.log(`[skill-backfill] skipped (topic has no skills entry): ${skippedNoSkills}`);
  console.log("[skill-backfill] per-topic coverage:");
  for (const [topic, { total, assigned: a }] of Object.entries(perTopicCoverage).sort()) {
    console.log(`  ${topic}: ${a}/${total} (${Math.round((a / total) * 100)}%)`);
  }

  if (write) {
    fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(questions, null, 2) + "\n");
    console.log("[skill-backfill] written.");
  } else {
    console.log("[skill-backfill] report only. Re-run with --write to apply.");
  }
}

main();
