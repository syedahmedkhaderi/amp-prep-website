import type { LessonSource } from "./types";
import { fractionsLessons } from "./fractions";
import { linesAndGraphsLessons } from "./lines-and-graphs";
import { realNumberSystemLessons } from "./real-number-system";
import { wholeNumbersLessons } from "./whole-numbers";
import { decimalsLessons } from "./decimals";
import { percentLessons } from "./percent";
import { solvingEquationsLessons } from "./solving-equations";
import { formulaRearrangementLessons } from "./formula-rearrangement";
import { exponentsLessons } from "./exponents";
import { polynomialsFactoringLessons } from "./polynomials-factoring";
import { geometryLessons } from "./geometry";
import { trigonometryLessons } from "./trigonometry";
import { functionsLogsLessons } from "./functions-logs";
import { linesSystemsLessons } from "./lines-systems";
import { dataWordProblemsLessons } from "./data-word-problems";
import { amp2AlgebraLessons } from "./amp2-algebra";
import { amp2FunctionsLessons } from "./amp2-functions";
import { amp2TrigSequencesLessons } from "./amp2-trig-sequences";

/**
 * Every authored lesson.
 *
 * Lessons are added a topic at a time. A skill with no lesson yet is not an
 * error: /learn shows it as "coming soon" and still links its practice
 * questions, so the feature is useful before the syllabus is fully covered.
 */
export const allLessons: LessonSource[] = [
  ...realNumberSystemLessons,
  ...wholeNumbersLessons,
  ...fractionsLessons,
  ...decimalsLessons,
  ...percentLessons,
  ...solvingEquationsLessons,
  ...formulaRearrangementLessons,
  ...exponentsLessons,
  ...polynomialsFactoringLessons,
  ...geometryLessons,
  ...trigonometryLessons,
  ...functionsLogsLessons,
  ...linesSystemsLessons,
  ...dataWordProblemsLessons,
  ...amp2AlgebraLessons,
  ...amp2FunctionsLessons,
  ...amp2TrigSequencesLessons,
  ...linesAndGraphsLessons,
];

export type { LessonSource };
