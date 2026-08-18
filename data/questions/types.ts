/**
 * A hand-authored multiple choice question.
 *
 * Deliberately narrower than the generated bank's shape: four options, exactly
 * one correct, and a rationale for every wrong one. The generator was allowed
 * five formats and produced 143 groups of questions that share both a template
 * and an answer; constraining the format is part of not repeating that.
 *
 * `skillSlug` is required, which the generated bank never had. It ties each
 * question to one objective so a lesson can link straight to practice for the
 * thing it just taught.
 */
export interface AuthoredQuestion {
  /** Stable id. Prefix `qa_` marks it as authored rather than generated. */
  id: string;
  exam: "AMP1" | "AMP2";
  topicSlug: string;
  skillSlug: string;
  difficulty: "easy" | "medium" | "hard";
  stem: string;
  /** Exactly four. Exactly one correct. */
  options: { content: string; correct?: true }[];
  /** The answer stated plainly, for the review screen. */
  answer: string;
  /** At least three, each a real step rather than a restatement. */
  steps: string[];
  /** Keyed by option index as a string. Every wrong option needs one. */
  distractors: Record<string, string>;
  /** One line naming the rule being tested. */
  concept: string;
}
