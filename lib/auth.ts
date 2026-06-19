/**
 * Lightweight JWT based auth for local SQLite operation. In production this
 * is replaced by Supabase Auth. The interface (getSession, getCurrentUser)
 * stays the same.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getDB, initDB } from "@/lib/db/sqlite";
import type { User, Plan, Role } from "@/lib/types";

const COOKIE_NAME = "amp_session";
const JWT_SECRET = process.env.JWT_SECRET || "local-dev-secret-change-in-production";

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

export async function signIn(email: string, password: string): Promise<User> {
  initDB();
  const db = getDB();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as any;
  if (!row) throw new Error("Invalid email or password.");

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) throw new Error("Invalid email or password.");

  return rowToUser(row);
}

export function createSessionToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
}

export async function getSession(): Promise<{ userId: string } | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
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
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as any;
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
