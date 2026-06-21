import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";
loadScriptsEnv();

import { GeminiKeyRotator } from "./lib/gemini-rotator";
import { generationPrompt } from "./lib/prompts";
import type { ExamCode, Difficulty, QType, TopicsFile, GeneratedQuestion } from "./lib/types";

const TOPICS_PATH = path.resolve(process.cwd(), "data/generated/topics.json");
const OUT_PATH = path.resolve(process.cwd(), "data/generated/questions.json");
const LOG_PATH = path.resolve(process.cwd(), "logs/generation-log.md");

const TYPES: QType[] = ["single_mcq", "multi_mcq", "matching", "fill_blank", "numeric"];
const DIFFS: Difficulty[] = ["easy", "medium", "hard"];

// Target: 3000 AMP1 + 800 AMP2 = 3800 total
// 20 AMP1 topics * 3 diffs * 50 = 3000
// 12 AMP2 topics * 3 diffs * ~22 = 800
const AMP1_PER_TOPIC_PER_DIFF = Number(process.env.AMP1_PER_DIFF) || 50;
const AMP2_PER_TOPIC_PER_DIFF = Number(process.env.AMP2_PER_DIFF) || 22;

const genId = () => "q_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function normalize(s: string): string {
  return s.toLowerCase().replace(/\$+/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ").slice(0, 200);
}

function loadTopics(): TopicsFile {
  if (!fs.existsSync(TOPICS_PATH)) {
    console.error("topics.json not found. Run parse-pdf first.");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(TOPICS_PATH, "utf-8"));
}

function loadExisting(): GeneratedQuestion[] {
  if (!fs.existsSync(OUT_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function save(all: GeneratedQuestion[]) {
  fs.writeFileSync(OUT_PATH, JSON.stringify(all, null, 2));
}

async function generateOne(
  rotator: GeminiKeyRotator,
  exam: ExamCode,
  topic: { name: string; slug: string; description: string },
  skills: string[],
  difficulty: Difficulty,
  type: QType,
  existingHashes: Set<string>
): Promise<GeneratedQuestion | null> {
  try {
    const prompt = generationPrompt(exam, topic.name, topic.description, skills, difficulty, type);
    const resp = await rotator.generateContent(prompt, {
      temperature: 0.85,
      responseMimeType: "application/json",
    });

    let item: any;
    try { item = JSON.parse(resp); } catch { return null; }
    if (!item || !item.stem) return null;

    const norm = normalize(item.stem);
    if (existingHashes.has(norm)) return null;
    existingHashes.add(norm);

    return {
      id: genId(), exam, topic_slug: topic.slug,
      type: item.type || type, difficulty,
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
  } catch (e: any) {
    return null;
  }
}

async function main() {
  console.log("=== AMP Prep Question Generation ===");
  const topicsFile = loadTopics();
  const existing = loadExisting();
  const existingHashes = new Set(existing.map(q => normalize(q.stem)));
  const all = [...existing];

  const rotator = new GeminiKeyRotator();
  console.log(`Existing: ${existing.length} questions`);

  const counts = {
    AMP1: all.filter(q => q.exam === "AMP1").length,
    AMP2: all.filter(q => q.exam === "AMP2").length,
  };

  const logLines: string[] = [
    "# Generation Log", "",
    `Started: ${new Date().toISOString()}`,
    `Keys: ${rotator.keyCount()}`,
    `Existing: ${existing.length}`, "",
    "## Progress", "",
  ];

  // Build work queue: (exam, topic, difficulty, type) tuples
  type Task = { exam: ExamCode; topic: any; diff: Difficulty; perDiff: number };
  const tasks: Task[] = [];

  for (const t of topicsFile.amp1) {
    for (const d of DIFFS) {
      tasks.push({ exam: "AMP1", topic: t, diff: d, perDiff: AMP1_PER_TOPIC_PER_DIFF });
    }
  }
  for (const t of topicsFile.amp2) {
    for (const d of DIFFS) {
      tasks.push({ exam: "AMP2", topic: t, diff: d, perDiff: AMP2_PER_TOPIC_PER_DIFF });
    }
  }

  let totalGenerated = 0;
  let saveCounter = 0;

  for (const task of tasks) {
    const skills = task.topic.skills?.length > 0
      ? task.topic.skills.map((s: any) => s.name || s)
      : [task.topic.description];

    // Count what we already have for this topic+difficulty
    const have = all.filter(q =>
      q.topic_slug === task.topic.slug && q.difficulty === task.diff
    ).length;

    const needed = task.perDiff - have;
    if (needed <= 0) {
      console.log(`[${task.topic.slug}/${task.diff}] already have ${have}, skip`);
      continue;
    }

    console.log(`\n[${task.exam}] ${task.topic.name} / ${task.diff}: need ${needed}`);

    let made = 0;
    let attempts = 0;
    const maxAttempts = needed * 3;

    while (made < needed && attempts < maxAttempts) {
      attempts++;
      const type = TYPES[(made + attempts) % TYPES.length];

      const q = await generateOne(rotator, task.exam, task.topic, skills, task.diff, type, existingHashes);

      if (q) {
        all.push(q);
        counts[task.exam]++;
        made++;
        totalGenerated++;
        saveCounter++;

        if (made % 5 === 0 || made === needed) {
          console.log(`  ${task.diff}: ${made}/${needed} (total ${task.exam}: ${counts[task.exam]})`);
        }

        // Save every 10 questions
        if (saveCounter >= 10) {
          save(all);
          saveCounter = 0;
        }
      }
    }

    // Save after each topic+difficulty
    save(all);
    logLines.push(`- ${task.exam} ${task.topic.slug} ${task.diff}: +${made} (total ${task.exam}: ${counts[task.exam]})`);
  }

  save(all);

  const stats = rotator.stats();
  logLines.push("", "## Summary", "",
    `- Total questions: ${all.length}`,
    `- AMP1: ${counts.AMP1}`,
    `- AMP2: ${counts.AMP2}`,
    `- New this run: ${totalGenerated}`,
    `- API requests: ${stats.totalRequests}`,
    `- API successes: ${stats.totalSuccess}`,
    `- API errors: ${stats.totalErrors}`,
  );

  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, logLines.join("\n"));

  console.log(`\n=== DONE ===`);
  console.log(`Total: ${all.length} (AMP1: ${counts.AMP1}, AMP2: ${counts.AMP2})`);
  console.log(`New: ${totalGenerated} | API: ${stats.totalRequests} req, ${stats.totalSuccess} ok, ${stats.totalErrors} err`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
