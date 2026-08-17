/**
 * Shared domain types used across the app and API routes.
 */

export type QType = "single_mcq" | "multi_mcq" | "matching" | "fill_blank" | "numeric";
export type Difficulty = "easy" | "medium" | "hard";
export type ExamCode = "AMP1" | "AMP2";
export type Plan = "free" | "pro";
export type Role = "student" | "admin";

export interface Option {
  id: string;
  content: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface MatchItem {
  id: string;
  leftContent: string;
  correctChoiceIndex: number;
  orderIndex: number;
}

export interface NumericAnswer {
  correctValue: number;
  tolerance: number;
  acceptedExpressions: string[];
}

export interface Question {
  id: string;
  examId: string;
  topicId: string;
  /** Set only where the question maps unambiguously to one objective. */
  skillId?: string | null;
  type: QType;
  stem: string;
  difficulty: Difficulty;
  points: number;
  explanationSteps: string[];
  finalAnswer: string;
  distractorRationales: Record<string, string>;
  conceptSummary: string;
  source: string;
  status: string;
  isFree: boolean;
  options?: Option[];
  matches?: MatchItem[];
  matchChoices?: string[];
  numericAnswer?: NumericAnswer;
  topicName?: string;
  topicSlug?: string;
}

export interface Topic {
  id: string;
  examId: string;
  name: string;
  slug: string;
  orderIndex: number;
  description: string;
  examCode?: ExamCode;
}

/**
 * One learning objective inside a topic, and the unit a lesson teaches.
 *
 * `source` records where the wording came from. "study-guide" is transcribed
 * verbatim from the official UDST Academic Mathematics Placement Study Guide
 * and carries the exam board's authority. "derived" is our own wording, used
 * for AMP 2 (which publishes no objective list) and for teaching splits of the
 * broad AMP 1 topics such as Word Problems.
 */
export interface Skill {
  id: string;
  topicId: string;
  name: string;
  slug: string;
  orderIndex: number;
  objective: string;
  source: "study-guide" | "derived";
  topicSlug?: string;
  examCode?: ExamCode;
}

/** A callout's tone. `watch-out` warns before the mistake, `common-mistake` after. */
export type CalloutKind = "tip" | "watch-out" | "common-mistake";

/**
 * One step of a worked example.
 *
 * `why` is the field that makes a worked example teaching rather than a
 * transcript: it says why the step is allowed, not just what changed.
 */
export interface WorkedStep {
  action: string;
  math?: string;
  why: string;
}

/**
 * A lesson body is an ordered list of these.
 *
 * `graph` and `diagram` carry the specs defined in lib/math/plot.ts
 * (PlotSpec and DiagramSpec). They are typed as unknown here so that the
 * domain types stay free of a dependency on the rendering layer; the lesson
 * renderer narrows them at the point of use.
 */
export type LessonBlock =
  | { type: "prose"; text: string }
  | { type: "definition"; term: string; meaning: string }
  | { type: "worked_example"; prompt: string; steps: WorkedStep[]; answer: string }
  | { type: "graph"; spec: unknown; caption?: string }
  /**
   * A graph the reader can change with sliders. Used only where the movement
   * is the idea being taught, such as how h shifts a parabola sideways.
   * Payload is InteractivePlotSpec from components/lesson/PlotWithSliders.
   */
  | { type: "interactive"; spec: unknown; caption?: string }
  | { type: "diagram"; spec: unknown; caption?: string }
  /**
   * A comparison table. Rules, conversions and sign cases are far easier to
   * scan as a grid than as a paragraph, which is what they were before.
   */
  | { type: "table"; caption?: string; headers: string[]; rows: string[][] }
  /** A short list of points. `ordered` when the sequence is the content. */
  | { type: "list"; ordered?: boolean; items: string[]; intro?: string }
  | { type: "callout"; kind: CalloutKind; text: string }
  | { type: "checkpoint"; questionIds: string[]; prompt?: string };

export interface Lesson {
  id: string;
  skillId: string;
  title: string;
  slug: string;
  orderIndex: number;
  summary: string;
  blocks: LessonBlock[];
  estMinutes: number;
  status: "draft" | "published";
  isFree: boolean;
  skillSlug?: string;
  topicSlug?: string;
  topicName?: string;
}

export type LessonState = "viewed" | "completed";

export interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  state: LessonState;
  viewedAt: string;
  completedAt: string | null;
}

export interface Exam {
  id: string;
  code: ExamCode;
  title: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
}

export interface Paper {
  id: string;
  examCode: ExamCode;
  name: string;
  isFree: boolean;
  orderIndex: number;
  questionCount: number;
}

export interface AttemptQuestion {
  question: Question;
  orderIndex: number;
}

export interface Attempt {
  id: string;
  userId: string;
  examId: string;
  mode: "practice" | "mock";
  topicId: string | null;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  total: number;
  timeLimitSeconds: number | null;
}

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  plan: Plan;
}

export interface AttemptAnswer {
  questionId: string;
  response: any;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
}

/**
 * Question sent to the client during an active attempt. Correct answer fields
 * are stripped. See spec Section 7 RLS rules and Section 16.
 */
export interface ClientSafeQuestion {
  id: string;
  type: QType;
  stem: string;
  difficulty: Difficulty;
  points: number;
  options?: { id: string; content: string; orderIndex: number }[];
  matches?: { id: string; leftContent: string; orderIndex: number }[];
  matchChoices?: string[];
  topicName?: string;
  topicSlug?: string;
}

export function toClientSafe(q: Question): ClientSafeQuestion {
  return {
    id: q.id,
    type: q.type,
    stem: q.stem,
    difficulty: q.difficulty,
    points: q.points,
    options: q.options?.map((o) => ({ id: o.id, content: o.content, orderIndex: o.orderIndex })),
    matches: q.matches?.map((m) => ({ id: m.id, leftContent: m.leftContent, orderIndex: m.orderIndex })),
    matchChoices: q.matchChoices,
    topicName: q.topicName,
    topicSlug: q.topicSlug,
  };
}

/**
 * Single question answer reveal for practice mode. Returned only after the
 * student saves their answer to that question.
 */
export interface PracticeFeedback {
  isCorrect: boolean;
  correctAnswer: string;
  explanationSteps: string[];
  finalAnswer: string;
  distractorRationales: Record<string, string>;
  conceptSummary: string;
}
