"use server";

import { redirect } from "next/navigation";
import {
  signUp,
  signIn,
  setSessionCookie,
  clearSessionCookie,
  createPasswordResetToken,
  resetPasswordWithToken,
} from "@/lib/auth";
import { sendMail, passwordResetEmail } from "@/lib/mailer";
import { checkPassword } from "@/lib/password";
import { checkRateLimit, clientIp, resetRateLimit } from "@/lib/rate-limit";

export type AuthResult = { error: string } | { ok: string } | undefined;

/**
 * Sign-in is limited twice over. The per-account limit is the one that protects
 * a specific user's password from being guessed, and it cannot be evaded by
 * changing source address. The per-address limit stops one client working
 * through many accounts. Forwarded headers are spoofable, which is exactly why
 * the per-account limit exists and is the tighter of the two.
 */
const SIGNIN_PER_ACCOUNT = { limit: 8, windowMs: 15 * 60 * 1000 };
const SIGNIN_PER_IP = { limit: 30, windowMs: 15 * 60 * 1000 };
const SIGNUP_PER_IP = { limit: 5, windowMs: 60 * 60 * 1000 };

const TOO_MANY = (seconds: number) =>
  `Too many attempts. Please try again in ${Math.ceil(seconds / 60)} minute${
    seconds > 60 ? "s" : ""
  }.`;

export async function signUpAction(formData: FormData): Promise<AuthResult> {
  const email = ((formData.get("email") as string) ?? "").trim();
  const password = (formData.get("password") as string) ?? "";
  const fullName = ((formData.get("fullName") as string) ?? "").trim();

  if (!email || !password || !fullName) {
    return { error: "All fields are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const strength = checkPassword(password, [email, fullName]);
  if (!strength.ok) return { error: strength.reason };

  const ip = await clientIp();
  const limit = checkRateLimit(`signup:ip:${ip}`, SIGNUP_PER_IP.limit, SIGNUP_PER_IP.windowMs);
  if (!limit.allowed) return { error: TOO_MANY(limit.retryAfterSeconds) };

  try {
    const user = await signUp(email, password, fullName);
    await setSessionCookie(user.id);
  } catch (e: any) {
    return { error: e.message };
  }
  redirect("/dashboard");
}

export async function signInAction(formData: FormData): Promise<AuthResult> {
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const password = (formData.get("password") as string) ?? "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const ip = await clientIp();
  const accountKey = `signin:account:${email}`;
  const ipKey = `signin:ip:${ip}`;

  const byAccount = checkRateLimit(accountKey, SIGNIN_PER_ACCOUNT.limit, SIGNIN_PER_ACCOUNT.windowMs);
  if (!byAccount.allowed) return { error: TOO_MANY(byAccount.retryAfterSeconds) };

  const byIp = checkRateLimit(ipKey, SIGNIN_PER_IP.limit, SIGNIN_PER_IP.windowMs);
  if (!byIp.allowed) return { error: TOO_MANY(byIp.retryAfterSeconds) };

  let userId: string;
  try {
    const user = await signIn(email, password);
    userId = user.id;
  } catch (e: any) {
    return { error: e.message };
  }

  // Only a successful sign-in clears the counter, so a long run of failures
  // still costs the attacker the full window.
  resetRateLimit(accountKey);
  await setSessionCookie(userId);
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/**
 * Both limits are tight because this endpoint sends mail to an address the
 * caller chose. Unthrottled it is a way to have this server repeatedly email
 * someone who never asked, from a domain they may trust.
 */
const RESET_REQUEST_PER_IP = { limit: 5, windowMs: 60 * 60 * 1000 };
const RESET_REQUEST_PER_EMAIL = { limit: 3, windowMs: 60 * 60 * 1000 };
const RESET_SUBMIT_PER_IP = { limit: 10, windowMs: 15 * 60 * 1000 };

/**
 * Identical whether or not the address has an account.
 *
 * Saying "no account with that email" would let anyone test addresses against
 * the user table one at a time. The cost of the ambiguity is that a typo looks
 * like success, which is why the wording says what to check.
 */
const RESET_SENT =
  "If that email address has an account, a reset link is on its way. It expires in 60 minutes. Check your spam folder if it does not appear.";

export async function requestPasswordResetAction(formData: FormData): Promise<AuthResult> {
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  if (!email) return { error: "Please enter your email address." };

  const ip = await clientIp();
  const perIp = checkRateLimit(`reset-req:ip:${ip}`, RESET_REQUEST_PER_IP.limit, RESET_REQUEST_PER_IP.windowMs);
  if (!perIp.allowed) return { error: TOO_MANY(perIp.retryAfterSeconds) };
  const perEmail = checkRateLimit(
    `reset-req:email:${email}`,
    RESET_REQUEST_PER_EMAIL.limit,
    RESET_REQUEST_PER_EMAIL.windowMs
  );
  // Still the success message: revealing that this address is being throttled
  // would leak the same fact the generic response exists to hide.
  if (!perEmail.allowed) return { ok: RESET_SENT };

  const issued = createPasswordResetToken(email);
  if (issued) {
    const mail = passwordResetEmail(issued.token);
    try {
      await sendMail({ to: email, subject: mail.subject, text: mail.text });
    } catch (e: any) {
      // The user is told nothing different, because telling them the send
      // failed would confirm the account exists. The operator needs to know.
      console.error("[auth] password reset email failed to send:", e?.message);
    }
  }

  return { ok: RESET_SENT };
}

export async function resetPasswordAction(formData: FormData): Promise<AuthResult> {
  const token = ((formData.get("token") as string) ?? "").trim();
  const password = (formData.get("password") as string) ?? "";
  const confirm = (formData.get("confirmPassword") as string) ?? "";

  if (!token) return { error: "That reset link is missing its token. Please request a new one." };
  if (!password) return { error: "Please choose a new password." };
  if (password !== confirm) return { error: "The two passwords do not match." };

  const strength = checkPassword(password);
  if (!strength.ok) return { error: strength.reason };

  const ip = await clientIp();
  const limit = checkRateLimit(`reset-submit:ip:${ip}`, RESET_SUBMIT_PER_IP.limit, RESET_SUBMIT_PER_IP.windowMs);
  if (!limit.allowed) return { error: TOO_MANY(limit.retryAfterSeconds) };

  try {
    await resetPasswordWithToken(token, password);
  } catch (e: any) {
    return { error: e.message };
  }

  // No session is created. The reset revoked every session for the account,
  // including any the attacker held, and signing in proves the new password
  // was actually received rather than merely submitted.
  redirect("/signin?reset=1");
}
