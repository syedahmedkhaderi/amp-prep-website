import { headers } from "next/headers";
import { getDB, initDB } from "@/lib/db/sqlite";

/**
 * Fixed-window rate limiting, stored in SQLite.
 *
 * Sign-in had no throttle at all, which makes credential stuffing free: an
 * attacker can try passwords against a known email as fast as the server will
 * answer. This is the cheapest thing that stops that.
 *
 * The counter lives in the application database on purpose. That is correct
 * only because the app runs as a single instance against a local SQLite file
 * (see DEPLOYMENT.md). If this is ever run on more than one instance, each one
 * keeps its own counters and the effective limit multiplies by the instance
 * count; at that point this needs to move to a shared store such as Redis.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

function ensureTable(): void {
  initDB();
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      window_start INTEGER NOT NULL
    );
  `);
}

/**
 * Count one attempt against `key` and say whether it is allowed.
 *
 * Call this once per attempt. Windows are fixed rather than sliding: a caller
 * that exhausts its budget waits out the remainder of the window.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  ensureTable();
  const db = getDB();
  const now = Date.now();

  const row = db
    .prepare("SELECT count, window_start FROM rate_limits WHERE key = ?")
    .get(key) as { count: number; window_start: number } | undefined;

  if (!row || now - row.window_start >= windowMs) {
    db.prepare(
      `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start`
    ).run(key, now);
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (row.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((row.window_start + windowMs - now) / 1000)),
    };
  }

  db.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").run(key);
  return { allowed: true, remaining: limit - row.count - 1, retryAfterSeconds: 0 };
}

/** Clear a key's counter, e.g. after a successful sign-in. */
export function resetRateLimit(key: string): void {
  ensureTable();
  getDB().prepare("DELETE FROM rate_limits WHERE key = ?").run(key);
}

/**
 * Best-effort client address for keying limits.
 *
 * Behind a proxy the socket address is the proxy, so the forwarded headers are
 * used. Those are client-controlled and can be spoofed, which is why limits are
 * keyed on the address *and* the account being targeted: spoofing the address
 * does not lift the per-account limit protecting a specific user's password.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Limits for the authenticated attempt-write endpoints, keyed per user.
 *
 * These are not about credential guessing. The practice answer endpoint returns
 * the correct answer and worked solution once a question is answered, so an
 * authenticated free account can walk the whole question bank through it. The
 * ceilings are set well above what a person sitting a test can produce and well
 * below what a script needs to be worth writing.
 */
export const ATTEMPT_LIMITS = {
  answer: { limit: 240, windowMs: 5 * 60 * 1000 },
  submit: { limit: 40, windowMs: 10 * 60 * 1000 },
  time: { limit: 600, windowMs: 5 * 60 * 1000 },
} as const;

/**
 * Apply a per-user limit to an API route. Returns a 429 to send back, or null
 * when the request is within budget.
 */
export function rateLimitResponse(
  scope: keyof typeof ATTEMPT_LIMITS,
  userId: string
): Response | null {
  const { limit, windowMs } = ATTEMPT_LIMITS[scope];
  const result = checkRateLimit(`${scope}:user:${userId}`, limit, windowMs);
  if (result.allowed) return null;

  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
      },
    }
  );
}

/** Drop expired rows so the table does not grow without bound. */
export function pruneRateLimits(olderThanMs = 24 * 60 * 60 * 1000): number {
  ensureTable();
  return getDB()
    .prepare("DELETE FROM rate_limits WHERE window_start < ?")
    .run(Date.now() - olderThanMs).changes;
}
