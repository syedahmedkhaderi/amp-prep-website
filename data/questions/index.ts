import type { AuthoredQuestion } from "./types";
import { amp2TrigQuestions } from "./amp2-trig";
import { amp2FunctionQuestions } from "./amp2-functions";
import { amp2Batch2 } from "./amp2-batch2";
import { amp2Batch3 } from "./amp2-batch3";
import { amp1Batch1 } from "./amp1-batch1";
import { amp1Batch2 } from "./amp1-batch2";
import { amp1Batch3 } from "./amp1-batch3";
import { amp2Batch4 } from "./amp2-batch4";
import { amp1Batch4 } from "./amp1-batch4";
import { amp2Batch5 } from "./amp2-batch5";
import { amp1Batch5 } from "./amp1-batch5";
import { amp2Batch6 } from "./amp2-batch6";
import { amp1Batch6 } from "./amp1-batch6";
import { amp2Batch7 } from "./amp2-batch7";
import { amp1Batch7 } from "./amp1-batch7";
import { amp2Batch8 } from "./amp2-batch8";
import { amp2Batch9 } from "./amp2-batch9";
import { amp1Batch8 } from "./amp1-batch8";
import { amp1Batch9 } from "./amp1-batch9";
import { amp1Batch10 } from "./amp1-batch10";

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
  ...amp1Batch1,
  ...amp1Batch2,
  ...amp1Batch3,
  ...amp2Batch4,
  ...amp1Batch4,
  ...amp2Batch5,
  ...amp1Batch5,
  ...amp2Batch6,
  ...amp1Batch6,
  ...amp2Batch7,
  ...amp1Batch7,
  ...amp2Batch8,
  ...amp2Batch9,
  ...amp1Batch8,
  ...amp1Batch9,
  ...amp1Batch10,
];

export type { AuthoredQuestion };
