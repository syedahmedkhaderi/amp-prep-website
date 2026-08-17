import { enrichments } from "./enrichment";
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
const authoredLessons: LessonSource[] = [
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

/**
 * Apply the enrichment blocks before anything reads the lessons.
 *
 * These live in a separate file because they were added in one pass across 18
 * lessons, and threading them back into fourteen topic files by hand would have
 * made that diff unreviewable. Applying them here rather than in a database
 * migration is what makes them survive `npm run seed`, which rebuilds the
 * lessons table from this array.
 *
 * The checkpoint stays last: it is the "now you try", and it only makes sense
 * after everything that teaches.
 */
function enrich(lesson: LessonSource): LessonSource {
  const entry = enrichments.find((e) => lesson.skillSlug.startsWith(e.match));
  if (!entry) return lesson;

  const present = new Set(lesson.blocks.map((b) => b.type));
  const toAdd = entry.blocks.filter((b) => !present.has(b.type));
  if (toAdd.length === 0) return lesson;

  const checkpointAt = lesson.blocks.findIndex((b) => b.type === "checkpoint");
  const blocks =
    checkpointAt === -1
      ? [...lesson.blocks, ...toAdd]
      : [
          ...lesson.blocks.slice(0, checkpointAt),
          ...toAdd,
          ...lesson.blocks.slice(checkpointAt),
        ];

  return { ...lesson, blocks };
}

export const allLessons: LessonSource[] = authoredLessons.map(enrich);

export type { LessonSource };
