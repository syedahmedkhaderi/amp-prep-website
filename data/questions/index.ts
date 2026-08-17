import type { AuthoredQuestion } from "./types";
import { amp2TrigQuestions } from "./amp2-trig";
import { amp2FunctionQuestions } from "./amp2-functions";
import { amp2Batch2 } from "./amp2-batch2";
import { amp2Batch3 } from "./amp2-batch3";

/**
 * Hand-authored questions, merged into the generated bank by
 * scripts/merge-questions.ts.
 *
 * These exist because de-duplication retired 206 generated questions and left
 * AMP 2 thin: 20 papers of 60 drawing on a pool of 257 means a student sitting
 * several mocks meets the same item repeatedly.
 */
export const authoredQuestions: AuthoredQuestion[] = [
  ...amp2TrigQuestions,
  ...amp2FunctionQuestions,
  ...amp2Batch2,
  ...amp2Batch3,
];

export type { AuthoredQuestion };
