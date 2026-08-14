import * as fs from "fs";
import * as path from "path";
import { GeminiKeyRotator } from "./lib/gemini-rotator";
import { verifyPrompt } from "./lib/prompts";
import { loadScriptsEnv } from "./lib/env";
import { checkQuestion } from "../lib/math/render-check";
import type { GeneratedQuestion, VerifiedQuestion } from "./lib/types";

loadScriptsEnv();

/**
 * Independent verification pass. For each question we ask Gemini to solve it
 * from scratch and compare the independent answer to the claimed correct
 * answer. Questions that disagree, or that fail structural checks, are marked
 * needsReview and never auto published.
 *
 * Structural checks:
 * - single_mcq: exactly one is_correct option.
 * - multi_mcq: at least two correct.
 * - matching: every match has a valid choice index.
 * - numeric: has numeric_answer with a value.
 * - All: stem is non empty, LaTeX passes parse check (basic).
 *
 * Output: /data/generated/questions-verified.json
 *
 * TWO THINGS TO KNOW BEFORE RUNNING THIS.
 *
 * It calls the Gemini API once per question — 3,789 of them. It is not a cheap
 * structural check and it is not part of any test or deploy sequence. The
 * bank-wide LaTeX gate people usually want is tests/latex-render.test.ts, which
 * runs offline in seconds.
 *
 * It writes its output incrementally, so an interrupted run leaves a short but
 * syntactically valid questions-verified.json behind — and scripts/seed.ts
 * prefers that file over questions.json. A run stopped early once left 50
 * questions against a 3,789-question bank. seed.ts now refuses a verified file
 * that covers less than 90% of the raw bank, but the cleanest habit is to
 * delete a partial file rather than rely on that guard.
 */

const IN_PATH = path.resolve(process.cwd(), "data/generated/questions.json");
const OUT_PATH = path.resolve(process.cwd(), "data/generated/questions-verified.json");

function structuralCheck(q: GeneratedQuestion): { ok: boolean; reason?: string } {
  if (!q.stem || q.stem.trim().length < 5) return { ok: false, reason: "Stem too short." };
  if (q.type === "single_mcq") {
    if (!q.options || q.options.length < 3) return { ok: false, reason: "Needs at least 3 options." };
    const correct = q.options.filter((o) => o.is_correct);
    if (correct.length !== 1) return { ok: false, reason: `Expected 1 correct, found ${correct.length}.` };
  }
  if (q.type === "multi_mcq") {
    if (!q.options || q.options.length < 3) return { ok: false, reason: "Needs at least 3 options." };
    const correct = q.options.filter((o) => o.is_correct);
    if (correct.length < 2) return { ok: false, reason: `Expected >=2 correct, found ${correct.length}.` };
  }
  if (q.type === "matching") {
    if (!q.matches || q.matches.length < 3) return { ok: false, reason: "Needs at least 3 matches." };
    if (!q.match_choices || q.match_choices.length < q.matches.length) {
      return { ok: false, reason: "Not enough match choices." };
    }
  }
  if (q.type === "numeric") {
    if (!q.numeric_answer || typeof q.numeric_answer.value !== "number") {
      return { ok: false, reason: "Missing numeric_answer.value." };
    }
  }
  if (q.type === "fill_blank") {
    if (!q.options || q.options.length < 3) return { ok: false, reason: "Fill blank needs options." };
    const correct = q.options.filter((o) => o.is_correct);
    if (correct.length !== 1) return { ok: false, reason: `Fill blank expected 1 correct, found ${correct.length}.` };
  }
  if (!q.explanation_steps || q.explanation_steps.length < 2) {
    return { ok: false, reason: "Needs at least 2 explanation steps." };
  }
  // Every math segment must actually render. A question that fails here shows
  // raw LaTeX to the student, so it is a hard structural failure rather than
  // something to flag for review.
  const renderFailures = checkQuestion(q);
  if (renderFailures.length > 0) {
    const first = renderFailures[0];
    return {
      ok: false,
      reason: `LaTeX does not render (${first.path}): ${first.message}`,
    };
  }
  return { ok: true };
}

async function main() {
  if (!fs.existsSync(IN_PATH)) {
    console.error(`[verify] questions.json not found. Run generate first.`);
    process.exit(1);
  }

  const questions: GeneratedQuestion[] = JSON.parse(fs.readFileSync(IN_PATH, "utf-8"));
  console.log(`[verify] Loaded ${questions.length} questions.`);

  const rotator = new GeminiKeyRotator();
  const verified: VerifiedQuestion[] = [];
  let passed = 0;
  let needsReview = 0;
  let structuralFail = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const sc = structuralCheck(q);
    if (!sc.ok) {
      structuralFail++;
      verified.push({ ...q, verified: false, needsReview: true, verificationNotes: sc.reason });
      if (structuralFail % 10 === 0) console.log(`  [${i + 1}/${questions.length}] Structural fail: ${sc.reason}`);
      continue;
    }

    // Independent solve via Gemini
    try {
      const prompt = verifyPrompt(q.stem, q.options, q.final_answer);
      const resp = await rotator.generateContent(prompt, {
        temperature: 0.1,
        responseMimeType: "application/json",
      });
      let result: any;
      try {
        result = JSON.parse(resp);
      } catch {
        result = { agrees: false, notes: "Verification parse failed." };
      }

      const ok = result.agrees === true;
      if (ok) {
        passed++;
      } else {
        needsReview++;
      }
      verified.push({
        ...q,
        verified: ok,
        needsReview: !ok,
        verificationNotes: result.notes || (ok ? "Agreement confirmed." : "Independent solver disagrees."),
      });
    } catch (e: any) {
      needsReview++;
      verified.push({ ...q, verified: false, needsReview: true, verificationNotes: `Verify error: ${e.message}` });
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  [verify] ${i + 1}/${questions.length} done. Passed: ${passed}, needs review: ${needsReview}, structural fail: ${structuralFail}`);
      // Save incrementally
      fs.writeFileSync(OUT_PATH, JSON.stringify(verified, null, 2));
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(verified, null, 2));
  console.log(`\n[verify] Done. Passed: ${passed}, needs review: ${needsReview}, structural fail: ${structuralFail}, total: ${verified.length}`);
  console.log(`[verify] Output: ${OUT_PATH}`);
}

main().catch((e) => {
  console.error("[verify] Fatal:", e);
  process.exit(1);
});
