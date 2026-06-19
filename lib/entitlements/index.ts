/**
 * Entitlement logic: daily practice cap, weekly mock cap, Pro gating.
 * All enforced server side. Spec Section 9 and Section 16.
 */

import { getDB, initDB } from "@/lib/db/sqlite";
import type { User } from "@/lib/types";

const DAILY_PRACTICE_CAP = 20;
const WEEKLY_MOCK_CAP = 1;
const FREE_BOOKMARK_CAP = 10;

export interface Entitlements {
  plan: "free" | "pro";
  isPro: boolean;
  dailyPracticeUsed: number;
  dailyPracticeLimit: number;
  weeklyMocksUsed: number;
  weeklyMockLimit: number;
  canPractice: boolean;
  canTakeMock: boolean;
  canAccessAMP2: boolean;
  bookmarkLimit: number;
}

export function getEntitlements(user: User): Entitlements {
  const isPro = user.plan === "pro";
  const dailyUsed = countTodayPractice(user.id);
  const weeklyUsed = countWeeklyMocks(user.id);

  return {
    plan: user.plan,
    isPro,
    dailyPracticeUsed: dailyUsed,
    dailyPracticeLimit: isPro ? Infinity : DAILY_PRACTICE_CAP,
    weeklyMocksUsed: weeklyUsed,
    weeklyMockLimit: isPro ? Infinity : WEEKLY_MOCK_CAP,
    canPractice: isPro || dailyUsed < DAILY_PRACTICE_CAP,
    canTakeMock: isPro || weeklyUsed < WEEKLY_MOCK_CAP,
    canAccessAMP2: isPro,
    bookmarkLimit: isPro ? Infinity : FREE_BOOKMARK_CAP,
  };
}

export function countTodayPractice(userId: string): number {
  initDB();
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);
  const result = db.prepare(
    `SELECT COUNT(DISTINCT aq.question_id) as c
     FROM attempts a
     JOIN attempt_questions aq ON aq.attempt_id = a.id
     JOIN attempt_answers aa ON aa.attempt_id = a.id AND aa.question_id = aq.question_id
     WHERE a.user_id = ? AND a.mode = 'practice' AND date(a.started_at) = ?`
  ).get(userId, today) as any;
  return result?.c || 0;
}

export function countWeeklyMocks(userId: string): number {
  initDB();
  const db = getDB();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare(
    `SELECT COUNT(*) as c FROM attempts
     WHERE user_id = ? AND mode = 'mock' AND started_at >= ?`
  ).get(userId, weekAgo) as any;
  return result?.c || 0;
}

export const PLAN_LIMITS = {
  DAILY_PRACTICE_CAP,
  WEEKLY_MOCK_CAP,
  FREE_BOOKMARK_CAP,
} as const;
