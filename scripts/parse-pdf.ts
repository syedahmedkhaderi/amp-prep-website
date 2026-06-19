import * as fs from "fs";
import * as path from "path";
import { GeminiKeyRotator } from "./lib/gemini-rotator";
import { pdfParsePrompt } from "./lib/prompts";
import { loadScriptsEnv } from "./lib/env";
import {
  DEFAULT_AMP1_TOPICS,
  DEFAULT_AMP2_TOPICS,
  type TopicsFile,
  type TopicOutline,
} from "./lib/types";

loadScriptsEnv();

/**
 * Parse the uploaded AMP study guide PDF using Gemini.
 *
 * Sends the PDF bytes to Gemini as inlineData with a prompt asking for a
 * structured outline: topics, skills, difficulty spread, question formats.
 *
 * Falls back to the DEFAULT_AMP1_TOPICS list from the spec if Gemini parsing
 * fails or returns fewer than 10 topics.
 *
 * Output: /data/generated/topics.json
 */

const PDF_PATH = path.resolve(
  process.cwd(),
  "data/source/udst_amp_study_guide-min-compressed_1_1_1_1.pdf"
);
const OUT_PATH = path.resolve(process.cwd(), "data/generated/topics.json");

async function main() {
  console.log("[parse-pdf] Starting PDF parse with Gemini.");

  if (!fs.existsSync(PDF_PATH)) {
    console.error(`[parse-pdf] PDF not found at ${PDF_PATH}`);
    process.exit(1);
  }

  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const pdfBase64 = pdfBuffer.toString("base64");
  console.log(`[parse-pdf] PDF loaded: ${(pdfBuffer.length / 1024).toFixed(0)} KB`);

  const rotator = new GeminiKeyRotator();
  console.log(`[parse-pdf] Rotator initialized with ${rotator.keyCount()} keys.`);

  let parsedTopics: TopicOutline[] = [];

  try {
    console.log("[parse-pdf] Sending PDF to Gemini for topic extraction...");
    const response = await rotator.generateContent(pdfParsePrompt(), {
      model: rotator["config"].generationModel,
      temperature: 0.2,
      responseMimeType: "application/json",
      inlineData: { mimeType: "application/pdf", data: pdfBase64 },
    });

    const parsed = JSON.parse(response);
    const rawTopics = parsed.amp1_topics || parsed.topics || [];

    if (rawTopics.length >= 10) {
      parsedTopics = rawTopics.map((t: any, i: number) => ({
        index: i + 1,
        name: t.name,
        slug: t.slug || slugify(t.name),
        exam: "AMP1" as const,
        description: t.description || "",
        skills: (t.skills || []).map((s: string) => ({ name: s, description: "" })),
        difficultySpread: t.difficultySpread || { easy: 33, medium: 34, hard: 33 },
      }));
      console.log(`[parse-pdf] Gemini identified ${parsedTopics.length} AMP 1 topics.`);
    } else {
      throw new Error(`Only ${rawTopics.length} topics returned, need at least 10.`);
    }
  } catch (e: any) {
    console.warn(`[parse-pdf] Gemini parse failed: ${e.message}`);
    console.warn("[parse-pdf] Falling back to default topic list from spec.");
    parsedTopics = DEFAULT_AMP1_TOPICS.map((t, i) => ({
      index: i + 1,
      name: t.name,
      slug: t.slug,
      exam: "AMP1" as const,
      description: t.description,
      skills: [],
      difficultySpread: { easy: 30, medium: 45, hard: 25 },
    }));
  }

  const amp2Topics: TopicOutline[] = DEFAULT_AMP2_TOPICS.map((t, i) => ({
    index: i + 1,
    name: t.name,
    slug: t.slug,
    exam: "AMP2" as const,
    description: t.description,
    skills: [],
    difficultySpread: { easy: 20, medium: 40, hard: 40 },
  } as TopicOutline));

  const output: TopicsFile = {
    source: "udst_amp_study_guide-min-compressed_1_1_1_1.pdf",
    parsedAt: new Date().toISOString(),
    amp1: parsedTopics,
    amp2: amp2Topics,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`[parse-pdf] Wrote ${parsedTopics.length} AMP1 + ${amp2Topics.length} AMP2 topics to ${OUT_PATH}`);

  const stats = rotator.stats();
  console.log(`[parse-pdf] Rotator stats: ${stats.totalRequests} requests, ${stats.totalErrors} errors.`);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

main().catch((e) => {
  console.error("[parse-pdf] Fatal:", e);
  process.exit(1);
});
