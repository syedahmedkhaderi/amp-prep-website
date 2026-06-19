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

export interface Exam {
  id: string;
  code: ExamCode;
  title: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
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
