import { describe, it, expect, beforeEach } from "vitest";
import { getDB, initDB } from "@/lib/db/sqlite";
import { checkRateLimit, resetRateLimit, pruneRateLimits } from "@/lib/rate-limit";
import { checkPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { signUp, signIn, changePassword, revokeSessions, verifyPassword } from "@/lib/auth";
import { deleteUserAndData } from "@/lib/account";

const rand = () => Math.random().toString(36).slice(2, 10);

describe("rate limiting", () => {
  beforeEach(() => initDB());

  it("allows up to the limit then blocks", () => {
    const key = `test:${rand()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts down the remaining budget", () => {
    const key = `test:${rand()}`;
    expect(checkRateLimit(key, 3, 60_000).remaining).toBe(2);
    expect(checkRateLimit(key, 3, 60_000).remaining).toBe(1);
    expect(checkRateLimit(key, 3, 60_000).remaining).toBe(0);
  });

  it("starts a fresh window once the old one has passed", () => {
    const key = `test:${rand()}`;
    const windowMs = 60_000;

    expect(checkRateLimit(key, 1, windowMs).allowed).toBe(true);
    expect(checkRateLimit(key, 1, windowMs).allowed).toBe(false);

    // Backdate the window past its expiry rather than sleeping through it.
    getDB()
      .prepare("UPDATE rate_limits SET window_start = ? WHERE key = ?")
      .run(Date.now() - windowMs - 1, key);

    expect(checkRateLimit(key, 1, windowMs).allowed).toBe(true);
  });

  it("keeps separate keys independent", () => {
    const a = `test:${rand()}`;
    const b = `test:${rand()}`;
    checkRateLimit(a, 1, 60_000);
    expect(checkRateLimit(a, 1, 60_000).allowed).toBe(false);
    expect(checkRateLimit(b, 1, 60_000).allowed).toBe(true);
  });

  it("resets a key on demand, as a successful sign-in does", () => {
    const key = `test:${rand()}`;
    checkRateLimit(key, 1, 60_000);
    expect(checkRateLimit(key, 1, 60_000).allowed).toBe(false);
    resetRateLimit(key);
    expect(checkRateLimit(key, 1, 60_000).allowed).toBe(true);
  });

  it("prunes rows older than the cutoff and keeps fresh ones", () => {
    const db = getDB();
    const stale = `test:stale:${rand()}`;
    const fresh = `test:fresh:${rand()}`;

    checkRateLimit(fresh, 5, 60_000);
    // Backdate a row rather than sleeping, so the assertion cannot race the
    // clock on a fast machine.
    db.prepare("INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)").run(
      stale,
      Date.now() - 48 * 60 * 60 * 1000
    );

    pruneRateLimits(24 * 60 * 60 * 1000);

    expect(db.prepare("SELECT * FROM rate_limits WHERE key = ?").get(stale)).toBeUndefined();
    expect(db.prepare("SELECT * FROM rate_limits WHERE key = ?").get(fresh)).toBeDefined();
  });
});

describe("password policy", () => {
  it("rejects anything under the minimum length", () => {
    expect(checkPassword("short").ok).toBe(false);
    expect(checkPassword("a".repeat(MIN_PASSWORD_LENGTH - 1)).ok).toBe(false);
  });

  it("rejects the passwords attackers try first", () => {
    for (const p of ["password123", "1234567890", "qwertyuiop", "letmein123"]) {
      expect(checkPassword(p).ok, p).toBe(false);
    }
  });

  it("rejects a single repeated character even when long enough", () => {
    expect(checkPassword("aaaaaaaaaaaa").ok).toBe(false);
  });

  it("rejects a password containing the user's own email or name", () => {
    expect(checkPassword("hamza12345678", ["hamza@example.com"]).ok).toBe(false);
    expect(checkPassword("my name is fatima", [null, "fatima"]).ok).toBe(false);
  });

  it("accepts a long passphrase", () => {
    expect(checkPassword("correct horse battery staple", ["a@b.com", "Ali"]).ok).toBe(true);
  });

  it("rejects an absurdly long password rather than hashing it", () => {
    expect(checkPassword("x".repeat(500)).ok).toBe(false);
  });
});

describe("session invalidation", () => {
  it("bumps token_version so older tokens stop matching", async () => {
    const user = await signUp(`tv_${rand()}@example.com`, "correct horse battery", "TV");
    const db = getDB();
    const version = () =>
      (db.prepare("SELECT token_version FROM users WHERE id = ?").get(user.id) as any)
        .token_version;

    expect(version()).toBe(0);
    revokeSessions(user.id);
    expect(version()).toBe(1);

    deleteUserAndData(user.id);
  });

  it("changing a password revokes sessions and updates the hash", async () => {
    const email = `pw_${rand()}@example.com`;
    const user = await signUp(email, "correct horse battery", "PW");
    const db = getDB();

    await changePassword(user.id, "correct horse battery", "a totally different phrase");

    expect(await verifyPassword(user.id, "a totally different phrase")).toBe(true);
    expect(await verifyPassword(user.id, "correct horse battery")).toBe(false);
    expect(
      (db.prepare("SELECT token_version FROM users WHERE id = ?").get(user.id) as any)
        .token_version
    ).toBe(1);

    deleteUserAndData(user.id);
  });

  it("refuses a password change without the current password", async () => {
    const user = await signUp(`pw2_${rand()}@example.com`, "correct horse battery", "PW2");
    await expect(changePassword(user.id, "wrong", "another good passphrase")).rejects.toThrow();
    expect(await verifyPassword(user.id, "correct horse battery")).toBe(true);
    deleteUserAndData(user.id);
  });
});

describe("sign-in", () => {
  it("gives the same error for an unknown email and a wrong password", async () => {
    const email = `si_${rand()}@example.com`;
    const user = await signUp(email, "correct horse battery", "SI");

    const unknown = await signIn(`nobody_${rand()}@example.com`, "whatever").catch((e) => e.message);
    const wrong = await signIn(email, "not the password").catch((e) => e.message);

    expect(unknown).toBe(wrong);
    deleteUserAndData(user.id);
  });

  it("does not return early for an unknown email", async () => {
    // The miss path runs a dummy bcrypt compare, so it should cost roughly what
    // a real comparison costs rather than returning instantly. The threshold is
    // deliberately loose; the point is that it is not ~0ms.
    const start = Date.now();
    await signIn(`nobody_${rand()}@example.com`, "whatever").catch(() => {});
    expect(Date.now() - start).toBeGreaterThan(5);
  });
});
