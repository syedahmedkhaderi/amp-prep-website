import type { Difficulty, QType } from "./types";

/**
 * All prompts for the generation pipeline, centralized so they can be tuned
 * without touching the pipeline scripts.
 */

export function pdfParsePrompt(): string {
  return `You are a mathematics curriculum analyst. You are given a study guide PDF for the UDST Academic Mathematics Placement (AMP) test.

Your job is to produce a structured outline of the mathematics topics covered in the PDF. Capture the SKILLS inside each topic, the difficulty distribution observed, and the question FORMATS present. Do NOT copy verbatim question text. Describe skills and difficulty only.

Return STRICT JSON only, no prose, with this exact shape:
{
  "amp1_topics": [
    {
      "name": "topic name",
      "slug": "kebab-case-slug",
      "description": "one sentence description of what this topic covers",
      "skills": ["skill 1", "skill 2"],
      "difficultySpread": { "easy": 0, "medium": 0, "hard": 0 }
    }
  ],
  "question_formats": ["single_mcq", "multi_mcq", "numeric", "fill_blank"],
  "summary": "one paragraph summary of the test structure"
}

Rules:
- Identify all distinct mathematics topic areas covered in the study guide.
- For each topic list 3 to 6 specific skills students must master.
- difficultySpread numbers are approximate percentages (0 to 100) summing to 100.
- slug values must be unique, lowercase, hyphen separated.
- No dashes as sentence connectors. No emojis.`;
}

export function generationPrompt(
  exam: string,
  topicName: string,
  topicDescription: string,
  skills: string[],
  difficulty: Difficulty,
  type: QType
): string {
  return `You write original mathematics placement practice questions for high school level (AMP 1) or precalculus level (AMP 2) tests. You are given a topic, a difficulty, and a question type. Produce exactly ONE original item. Do not copy any existing question.

EXAM: ${exam}
TOPIC: ${topicName}
TOPIC DESCRIPTION: ${topicDescription}
RELEVANT SKILLS: ${skills.join(", ")}
DIFFICULTY: ${difficulty}
QUESTION TYPE: ${type}

Return STRICT JSON only, no prose, with this shape:
{
  "type": "${type}",
  "stem": "question text, with math in LaTeX using $...$ or $$...$$",
  "options": [{"content": "...", "is_correct": true}],
  "matches": [{"left_content": "...", "correct_choice_index": 0}],
  "match_choices": ["choice 1", "choice 2"],
  "numeric_answer": {"value": 0, "tolerance": 0, "accepted": ["2x"]},
  "final_answer": "the answer stated plainly",
  "explanation_steps": ["step 1 with math in LaTeX", "step 2"],
  "distractor_rationales": {"option content or index": "why this wrong option is plausible"},
  "concept_summary": "one line naming the rule or idea this tests"
}

FIELD RULES BY TYPE:
- single_mcq: exactly 4 options, exactly one is_correct=true. Distractors reflect common mistakes, not random values.
- multi_mcq: 4 to 6 options, at least two correct. Every wrong option needs a rationale.
- matching: 4 to 6 left_content items, each with a correct_choice_index. match_choices is the numbered legend (index 0 based).
- fill_blank: include "options" with 4 radio options, exactly one correct. The stem contains a blank marked as ___ or \\underline{\\quad}. Also fill numeric_answer if it is a numeric fill.
- numeric: do NOT include options. Provide numeric_answer with value, tolerance, and accepted equivalent expressions.

GLOBAL RULES:
- Solvable with a basic scientific calculator (Casio fx-85ES class). No tools beyond that.
- All math in valid LaTeX that KaTeX can render. Use \\frac, x^{2}, \\sqrt{}, \\cdot, \\sin, \\log, 90^{\\circ}. Never raw carets, asterisks for multiplication, or -> for arrows.
- Distractors must reflect common student mistakes, not random values.
- Every explanation_steps array has at least 3 clear steps, each with LaTeX where math appears.
- concept_summary is one line naming the rule tested.
- Keep wording plain. No dashes as connectors. No emojis. No filler words like "delve", "seamless", "unlock".`;
}

export function verifyPrompt(
  stem: string,
  options: { content: string; is_correct: boolean }[] | undefined,
  claimedAnswer: string
): string {
  const optsText = options
    ? options.map((o, i) => `  ${String.fromCharCode(65 + i)}. ${o.content} ${o.is_correct ? "[CLAIMED CORRECT]" : ""}`).join("\n")
    : "";
  return `You are an independent mathematics solver. Solve the following problem from scratch. Do not look at the claimed answer first.

PROBLEM:
${stem}
${optsText ? "\nOPTIONS:\n" + optsText : ""}

CLAIMED ANSWER (for comparison only, solve independently first): ${claimedAnswer}

Return STRICT JSON only, no prose:
{
  "solved_answer": "your independently computed answer, stated plainly",
  "solved_option_index": 0,
  "agrees": true,
  "notes": "one sentence on the solution method"
}

Rules:
- Solve the problem yourself. Then compare to the claimed answer.
- For multiple choice, solved_option_index is 0 based into the options array.
- agrees is true only if your independent solution matches the claimed answer.
- No dashes as connectors. No emojis.`;
}
