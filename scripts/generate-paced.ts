import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";
loadScriptsEnv();

import { GeminiKeyRotator } from "./lib/gemini-rotator";
import { generationPrompt } from "./lib/prompts";
import type { ExamCode, Difficulty, QType, TopicsFile, GeneratedQuestion } from "./lib/types";

/**
 * Simplified generation with strict pacing.
 * Fires one request every 4 seconds, cycling through keys round-robin.
 * With 6 available keys at 20 RPM each, this gives ~15 RPM per key.
 */

const TOPICS_PATH = path.resolve(process.cwd(), "data/generated/topics.json");
const OUT_PATH = path.resolve(process.cwd(), "data/generated/questions.json");
const DELAY_MS = 4000; // 4 seconds between requests
const TYPES: QType[] = ["single_mcq", "multi_mcq", "matching", "fill_blank", "numeric"];
const DIFFS: Difficulty[] = ["easy", "medium", "hard"];
const PER_DIFF = 6;

const genId = () => "q_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const normalize = (s: string) => s.toLowerCase().replace(/\$+/g, "").replace(/[^a-z0-9]+/g, " ").trim().slice(0, 200);

async function main() {
  const topicsFile: TopicsFile = JSON.parse(fs.readFileSync(TOPICS_PATH, "utf-8"));
  const existing: GeneratedQuestion[] = fs.existsSync(OUT_PATH)
    ? JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"))
    : [];
  const existingHashes = new Set(existing.map(q => normalize(q.stem)));
  const all = [...existing];
  let counts = { AMP1: existing.filter(q => q.exam === "AMP1").length, AMP2: existing.filter(q => q.exam === "AMP2").length };

  const rotator = new GeminiKeyRotator({ rpmPerKey: 15 });
  console.log(`[gen] ${rotator.keyCount()} keys, ${existing.length} existing questions. Delay: ${DELAY_MS}ms between requests.`);

  const allTopics = [
    ...topicsFile.amp1.map(t => ({ ...t, exam: "AMP1" as ExamCode })),
    ...topicsFile.amp2.map(t => ({ ...t, exam: "AMP2" as ExamCode })),
  ];

  let totalGenerated = 0;
  for (const topic of allTopics) {
    const skills = topic.skills?.length > 0 ? topic.skills.map(s => s.name) : [topic.description];
    console.log(`\n[gen] ${topic.exam} / ${topic.name} (existing: ${all.filter(q => q.topic_slug === topic.slug).length})`);

    // Skip if topic already has enough
    const topicCount = all.filter(q => q.topic_slug === topic.slug).length;
    if (topicCount >= PER_DIFF * DIFFS.length) {
      console.log(`  Already has ${topicCount} questions, skipping.`);
      continue;
    }

    for (const diff of DIFFS) {
      const existingForDiff = all.filter(q => q.topic_slug === topic.slug && q.difficulty === diff).length;
      const needed = PER_DIFF - existingForDiff;
      if (needed <= 0) {
        console.log(`  ${diff}: already have ${existingForDiff}`);
        continue;
      }

      let made = 0;
      let tries = 0;
      while (made < needed && tries < needed * 4) {
        tries++;
        const type = TYPES[tries % TYPES.length];

        await sleep(DELAY_MS);
        console.log(`  ${diff} ${type}: generating (${made}/${needed})...`);

        try {
          const prompt = generationPrompt(topic.exam, topic.name, topic.description, skills, diff, type);
          const resp = await rotator.generateContent(prompt, { temperature: 0.8, responseMimeType: "application/json" });
          let item: any;
          try { item = JSON.parse(resp); } catch { continue; }
          if (!item || !item.stem) continue;

          const norm = normalize(item.stem);
          if (existingHashes.has(norm)) {
            console.log(`    dedup, skipping`);
            continue;
          }
          existingHashes.add(norm);

          const q: GeneratedQuestion = {
            id: genId(), exam: topic.exam, topic_slug: topic.slug,
            type: item.type || type, difficulty: diff, stem: item.stem,
            options: item.options, matches: item.matches, match_choices: item.match_choices,
            numeric_answer: item.numeric_answer,
            final_answer: item.final_answer || "",
            explanation_steps: item.explanation_steps || [],
            distractor_rationales: item.distractor_rationales || {},
            concept_summary: item.concept_summary || "",
          };
          all.push(q);
          counts[topic.exam]++;
          made++;
          totalGenerated++;
          fs.writeFileSync(OUT_PATH, JSON.stringify(all, null, 2));
          console.log(`    OK (${counts[topic.exam]} total ${topic.exam})`);
        } catch (e: any) {
          console.log(`    ERROR: ${e.message.slice(0, 80)}`);
          // If rate limited, wait longer
          if (e.message.includes("failed")) {
            console.log(`    Waiting 30s before retry...`);
            await sleep(30000);
          }
        }
      }
    }
  }

  console.log(`\n[gen] Done. Generated ${totalGenerated} new questions. Total: ${all.length}`);
  console.log(`[gen] AMP1: ${counts.AMP1}, AMP2: ${counts.AMP2}`);
}

main().catch(e => { console.error("[gen] Fatal:", e); process.exit(1); });
