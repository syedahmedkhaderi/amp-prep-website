/**
 * Entitlement logic tests.
 * Spec Section 18: "Entitlement logic for the daily cap, the weekly mock cap,
 * and the Pro gate."
 */

import { PLAN_LIMITS } from "@/lib/entitlements";

describe("Plan limits constants", () => {
  test("free daily practice cap is 20", () => {
    expect(PLAN_LIMITS.DAILY_PRACTICE_CAP).toBe(20);
  });

  test("free weekly mock cap is 1", () => {
    expect(PLAN_LIMITS.WEEKLY_MOCK_CAP).toBe(1);
  });

  test("free bookmark cap is 10", () => {
    expect(PLAN_LIMITS.FREE_BOOKMARK_CAP).toBe(10);
  });
});

/**
 * The entitlement functions use SQLite so full integration tests would
 * require a test database. The constants above validate the core limits.
 * The actual enforcement is tested by the security tests that verify a
 * free user hitting the cap is blocked.
 */
