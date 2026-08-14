/**
 * JWT based auth over the SQLite user table, in production as well as locally.
 * There is no third-party auth provider: passwords are bcrypt hashes in the
 * users table and the session is a signed token in an httpOnly cookie.
 */

import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getDB, initDB } from "@/lib/db/sqlite";
import type { User, Plan, Role } from "@/lib/types";

const COOKIE_NAME = "amp_session";
const USER_COLUMNS = "id, email, full_name, role, plan";

const DEV_FALLBACK_SECRET = "local-dev-secret-change-in-production";

/**
 * Resolve the signing secret. In production a strong secret is mandatory: if it
 * is missing or left at the development default, we fail loudly rather than
 * silently signing forgeable tokens.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret === DEV_FALLBACK_SECRET) {
      throw new Error(
        "JWT_SECRET is not set to a secure value. Set a strong JWT_SECRET environment variable in production."
      );
    }
    return secret;
  }
  return secret || DEV_FALLBACK_SECRET;
}

const id = () => "u_" + Math.random().toString(36).slice(2, 12);

export async function signUp(email: string, password: string, fullName: string): Promise<User> {
  initDB();
  const db = getDB();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) throw new Error("An account with this email already exists.");

  const hash = await bcrypt.hash(password, 10);
  const userId = id();
  db.prepare(
    "INSERT INTO users (id, email, password_hash, full_name, role, plan) VALUES (?, ?, ?, ?, 'student', 'free')"
  ).run(userId, email.toLowerCase(), hash, fullName);

  return {
    id: userId,
    email: email.toLowerCase(),
    fullName,
    role: "student",
    plan: "free",
  };
}

/**
 * A bcrypt hash of a throwaway value, compared against when no user row exists
 * so that the miss path costs the same as the hit path. Returning immediately
 * on an unknown email makes response time disclose which addresses have
 * accounts, regardless of the error message being identical.
 */
const DUMMY_HASH = bcrypt.hashSync("no-such-user-placeholder", 10);

export async function signIn(email: string, password: string): Promise<User> {
  initDB();
  const db = getDB();
  const row = db.prepare(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = ?`
  ).get(email.toLowerCase()) as any;

  const ok = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !ok) throw new Error("Invalid email or password.");

  return rowToUser(row);
}

/**
 * Change a user's password after confirming the current one, then invalidate
 * every session so any other device is signed out. The caller is responsible
 * for issuing a fresh cookie for the session doing the changing.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!(await verifyPassword(userId, currentPassword))) {
    throw new Error("Your current password is not correct.");
  }
  const hash = await bcrypt.hash(newPassword, 10);
  initDB();
  const db = getDB();
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, userId);
  revokeSessions(userId);
}

/**
 * Confirm a signed-in user's own password, for actions that are destructive and
 * irreversible. Separate from signIn so that re-authentication is not entangled
 * with the sign-in flow's own error handling and future rate limiting.
 */
export async function verifyPassword(userId: string, password: string): Promise<boolean> {
  if (!password) return false;
  initDB();
  const db = getDB();
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as any;
  if (!row) return false;
  return bcrypt.compare(password, row.password_hash);
}

function currentTokenVersion(userId: string): number {
  initDB();
  const db = getDB();
  const row = db.prepare("SELECT token_version FROM users WHERE id = ?").get(userId) as any;
  return row ? Number(row.token_version ?? 0) : -1;
}

export function createSessionToken(userId: string): string {
  return jwt.sign({ sub: userId, tv: currentTokenVersion(userId) }, getJwtSecret(), {
    expiresIn: "7d",
  });
}

/**
 * Invalidate every existing session for a user by bumping their token version.
 * Sessions last seven days, so without this a stolen or shared token survives a
 * password change for a week — which would make the advice to change your
 * password after a compromise useless.
 */
export function revokeSessions(userId: string): void {
  initDB();
  const db = getDB();
  db.prepare("UPDATE users SET token_version = token_version + 1 WHERE id = ?").run(userId);
}

export async function getSession(): Promise<{ userId: string } | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getJwtSecret()) as any;
    // A token minted before the user's credentials changed is no longer valid,
    // even though its signature and expiry are still good.
    if (Number(payload.tv ?? 0) !== currentTokenVersion(payload.sub)) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  initDB();
  const db = getDB();
  const row = db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(session.userId) as any;
  if (!row) return null;
  return rowToUser(row);
}

export async function setSessionCookie(userId: string): Promise<void> {
  const token = createSessionToken(userId);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function requireUser(user: User | null): User {
  if (!user) throw new Error("Authentication required.");
  return user;
}

export function requirePro(user: User | null): User {
  const u = requireUser(user);
  if (u.plan !== "pro") throw new Error("Pro subscription required.");
  return u;
}

function rowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role as Role,
    plan: row.plan as Plan,
  };
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/**
 * One hour. Long enough to survive a slow inbox, short enough that a reset link
 * sitting in a mailbox is not a standing key to the account.
 */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Issue a reset token for an email address, or return null if no account has
 * that address.
 *
 * The caller must NOT tell the user which of those happened. Distinguishing
 * them turns this endpoint into an account-existence oracle: anyone could learn
 * whether a given person has an account here, which is exactly the information
 * a targeted phishing attempt needs.
 *
 * Any earlier tokens for the account are deleted, so requesting a second link
 * silently retires the first.
 */
export function createPasswordResetToken(email: string): { token: string; userId: string } | null {
  initDB();
  const db = getDB();
  const row = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as any;
  if (!row) return null;

  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(row.id);

  const token = crypto.randomBytes(32).toString("base64url");
  db.prepare(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(
    "prt_" + crypto.randomBytes(8).toString("hex"),
    row.id,
    hashToken(token),
    new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString()
  );

  return { token, userId: row.id };
}

/**
 * Spend a reset token and set a new password.
 *
 * Deliberately one function rather than a validate step and a separate apply
 * step: splitting them invites a caller to check the token, do something else,
 * and apply it later, which is where single-use guarantees get lost.
 *
 * Every session is revoked afterwards. Someone resetting a password may be
 * doing it because another party has access, and leaving that party's
 * seven-day session alive would defeat the point.
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  initDB();
  const db = getDB();

  const row = db
    .prepare("SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?")
    .get(hashToken(token)) as any;

  // One message for missing, spent and expired alike. Which one it was is not
  // useful to a legitimate user and is useful to someone guessing tokens.
  const invalid = new Error("That reset link is invalid or has expired. Please request a new one.");
  if (!row || row.used_at) throw invalid;
  if (new Date(row.expires_at).getTime() < Date.now()) throw invalid;

  const hash = await bcrypt.hash(newPassword, 10);
  const apply = db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, row.user_id);
    db.prepare("UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?").run(row.id);
    db.prepare("UPDATE users SET token_version = token_version + 1 WHERE id = ?").run(row.user_id);
  });
  apply();
}

/** Remove spent and expired tokens. Safe to call at any time. */
export function pruneResetTokens(): void {
  initDB();
  getDB()
    .prepare("DELETE FROM password_reset_tokens WHERE used_at IS NOT NULL OR expires_at < ?")
    .run(new Date().toISOString());
}
