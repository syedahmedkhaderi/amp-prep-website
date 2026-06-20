import * as fs from "fs";
import * as path from "path";
import { GeminiKeyRotator } from "./lib/gemini-rotator";
import { generationPrompt } from "./lib/prompts";
import { loadScriptsEnv } from "./lib/env";
import type {
  Difficulty,
  ExamCode,
  GeneratedQuestion,
  QType,
  TopicsFile,
  TopicOutline,
} from "./lib/types";

loadScriptsEnv();

/**
 * Generate original AMP 1 and AMP 2 practice questions using Gemini through
 * the key rotator. For each topic we generate items across difficulties and
 * question types. Output goes to /data/generated/questions.json.
 *
 * Targets are configurable via env. Defaults produce a useful bank that can
 * be expanded by re running the script with higher targets.
 *
 * Output: /data/generated/questions.json
 */

const TOPICS_PATH = path.resolve(process.cwd(), "data/generated/topics.json");
const OUT_PATH = path.resolve(process.cwd(), "data/generated/questions.json");
const LOG_PATH = path.resolve(process.cwd(), "Final_Outputs/generation-log.md");

const TYPES: QType[] = ["single_mcq", "multi_mcq", "matching", "fill_blank", "numeric"];

// Per topic per difficulty target. Configurable.
const PER_DIFFICULTY = Number(process.env.GEN_PER_DIFFICULTY) || 8;

// Approximate difficulty distribution
const DIFFS: Difficulty[] = ["easy", "medium", "hard"];

function genId(): string {
  return "q_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\$+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 200);
}

function loadTopics(): TopicsFile {
  if (!fs.existsSync(TOPICS_PATH)) {
    console.error(`[generate] topics.json not found at ${TOPICS_PATH}. Run parse-pdf first.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(TOPICS_PATH, "utf-8"));
}

function loadExisting(): GeneratedQuestion[] {
  if (!fs.existsSync(OUT_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
    return Array.isArray(data) ? data : data.questions || [];
  } catch {
    return [];
  }
}

async function generateForTopic(
  rotator: GeminiKeyRotator,
  topic: TopicOutline,
  skills: string[],
  exam: ExamCode,
  existingHashes: Set<string>,
  counts: Record<string, number>,
  onSave: (allSoFar: GeneratedQuestion[]) => void,
  globalAccumulator: GeneratedQuestion[]
): Promise<GeneratedQuestion[]> {
  const out: GeneratedQuestion[] = [];

  for (const diff of DIFFS) {
    const targetForThis = PER_DIFFICULTY;
    let made = 0;
    let attempts = 0;
    const maxAttempts = targetForThis * 3;

    while (made < targetForThis && attempts < maxAttempts) {
      attempts++;
      const type = TYPES[(made + attempts) % TYPES.length];

      try {
        const prompt = generationPrompt(
          exam,
          topic.name,
          topic.description,
          skills,
          diff,
          type
        );
        const resp = await rotator.generateContent(prompt, {
          temperature: 0.8,
          responseMimeType: "application/json",
        });

        let item: any;
        try {
          item = JSON.parse(resp);
        } catch {
          continue;
        }

        if (!item || !item.stem) continue;

        // Dedup check
        const norm = normalize(item.stem);
        if (existingHashes.has(norm)) {
          console.log(`  [dedup] Skipped near duplicate for ${topic.slug}/${diff}`);
          continue;
        }
        existingHashes.add(norm);

        const q: GeneratedQuestion = {
          id: genId(),
          exam,
          topic_slug: topic.slug,
          type: item.type || type,
          difficulty: diff,
          stem: item.stem,
          options: item.options,
          matches: item.matches,
          match_choices: item.match_choices,
          numeric_answer: item.numeric_answer,
          final_answer: item.final_answer || "",
          explanation_steps: item.explanation_steps || [],
          distractor_rationales: item.distractor_rationales || {},
          concept_summary: item.concept_summary || "",
        };

        out.push(q);
        globalAccumulator.push(q);
        made++;
        counts[exam] = (counts[exam] || 0) + 1;
        // Save incrementally
        onSave(globalAccumulator);
        if (made % 3 === 0 || made === targetForThis) {
          console.log(`  [${topic.slug}] ${diff}: ${made}/${targetForThis} items generated (exam total: ${counts[exam]})`);
        }
      } catch (e: any) {
        console.warn(`  [${topic.slug}] Generation error: ${e.message}`);
      }
    }
  }

  return out;
}

async function main() {
  console.log("[generate] Starting question generation.");
  const topicsFile = loadTopics();
  const existing = loadExisting();
  console.log(`[generate] Loaded ${existing.length} existing questions.`);

  const existingHashes = new Set(existing.map((q) => normalize(q.stem)));
  const allQuestions: GeneratedQuestion[] = [...existing];
  const counts: Record<string, number> = {
    AMP1: existing.filter((q) => q.exam === "AMP1").length,
    AMP2: existing.filter((q) => q.exam === "AMP2").length,
  };

  const onSave = (data: GeneratedQuestion[]) => {
    fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
  };

  const rotator = new GeminiKeyRotator();
  console.log(`[generate] Rotator: ${rotator.keyCount()} keys.`);
  console.log(`[generate] Target per topic per difficulty: ${PER_DIFFICULTY}`);

  const log: string[] = [
    "# Question Generation Log",
    "",
    `Started: ${new Date().toISOString()}`,
    `Keys: ${rotator.keyCount()}`,
    `Per topic per difficulty: ${PER_DIFFICULTY}`,
    "",
    "## Progress",
    "",
  ];

  // AMP 1 topics
  for (const topic of topicsFile.amp1) {
    console.log(`\n[generate] AMP1 topic: ${topic.name}`);
    const skills = topic.skills.length > 0 ? topic.skills.map((s) => s.name) : [topic.description];
    const qs = await generateForTopic(rotator, topic, skills, "AMP1", existingHashes, counts, onSave, allQuestions);
    log.push(`- AMP1 ${topic.slug}: +${qs.length} (running total AMP1: ${counts.AMP1})`);
  }

  // AMP 2 topics
  for (const topic of topicsFile.amp2) {
    console.log(`\n[generate] AMP2 topic: ${topic.name}`);
    const skills = topic.skills.length > 0 ? topic.skills.map((s) => s.name) : [topic.description];
    const qs = await generateForTopic(rotator, topic, skills, "AMP2", existingHashes, counts, onSave, allQuestions);
    log.push(`- AMP2 ${topic.slug}: +${qs.length} (running total AMP2: ${counts.AMP2})`);
  }

  const stats = rotator.stats();
  log.push("", "## Summary", "", `- Total questions: ${allQuestions.length}`, `- AMP1: ${counts.AMP1}`, `- AMP2: ${counts.AMP2}`, `- Total API requests: ${stats.totalRequests}`, `- Total errors: ${stats.totalErrors}`, "");

  fs.writeFileSync(OUT_PATH, JSON.stringify(allQuestions, null, 2));
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, log.join("\n"));

  console.log(`\n[generate] Done. ${allQuestions.length} total questions saved to ${OUT_PATH}`);
  console.log(`[generate] Stats: ${stats.totalRequests} requests, ${stats.totalErrors} errors.`);
}

main().catch((e) => {
  console.error("[generate] Fatal:", e);
  process.exit(1);
});
