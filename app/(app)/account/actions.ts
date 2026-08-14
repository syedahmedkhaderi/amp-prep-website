"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  changePassword,
  clearSessionCookie,
  getCurrentUser,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { deleteUserAndData } from "@/lib/account";
import { checkPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { getDB, initDB } from "@/lib/db/sqlite";

/**
 * Self service cancellation. Reverting your own plan to free only reduces your
 * privileges, so it is safe to expose directly. Granting Pro, by contrast, must
 * go through a verified payment (see /api/checkout and the payment webhook) or
 * an admin grant, never a direct self service action.
 */
export async function downgradeAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  initDB();
  const db = getDB();
  db.prepare("UPDATE users SET plan = 'free' WHERE id = ?").run(user.id);
  revalidatePath("/account");
  revalidatePath("/dashboard");
}

/**
 * Change your own password. Requires the current one, so a session left open on
 * a shared computer cannot be used to lock the owner out of their account.
 *
 * Changing the password ends every other session (see revokeSessions), which is
 * what makes it a real remedy for a compromised account rather than a gesture.
 * A fresh cookie is issued afterwards so the session doing the change survives.
 */
export async function changePasswordAction(
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };

  // Someone holding a stolen session cookie can reach this endpoint and guess
  // the current password to take the account over outright, rather than merely
  // reading it. Same exposure as sign-in, one layer in, so the same throttle.
  const limit = checkRateLimit(`pwchange:user:${user.id}`, 6, 15 * 60 * 1000);
  if (!limit.allowed) {
    return { error: "Too many attempts. Please try again later." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword !== confirmPassword) {
    return { error: "The new passwords do not match." };
  }

  const strength = checkPassword(newPassword, [user.email, user.fullName]);
  if (!strength.ok) return { error: strength.reason };

  if (newPassword === currentPassword) {
    return { error: "The new password must be different from the current one." };
  }

  try {
    await changePassword(user.id, currentPassword, newPassword);
  } catch (e: any) {
    return { error: e.message };
  }

  // revokeSessions invalidated this session's token too; re-issue it so the
  // device making the change stays signed in.
  //
  // Deliberately no revalidatePath here. Revalidating re-renders /account
  // within this same response, and that render reads the cookies from the
  // incoming request, which still carry the token just revoked. The page then
  // resolves to a signed-out user and bounces to /signin, logging out the very
  // device that changed the password. Nothing on this page derives from the
  // password, so there is nothing to revalidate.
  await setSessionCookie(user.id);
  return { ok: true };
}

/**
 * Permanently delete the signed-in user's own account and everything recorded
 * against it. The Privacy Policy promises this, so it has to actually happen:
 * the account row goes, and with it every attempt and every answer.
 *
 * The password is re-confirmed first. Deletion is irreversible, and a session
 * cookie left open on a shared computer should not be enough to destroy
 * someone's work.
 *
 * The erasure itself lives in lib/account.ts so it can be tested directly.
 */
export async function deleteAccountAction(
  formData: FormData
): Promise<{ error: string } | void> {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };

  const limit = checkRateLimit(`delete:user:${user.id}`, 6, 15 * 60 * 1000);
  if (!limit.allowed) {
    return { error: "Too many attempts. Please try again later." };
  }

  const password = String(formData.get("password") ?? "");
  if (!(await verifyPassword(user.id, password))) {
    return { error: "That password is not correct." };
  }

  deleteUserAndData(user.id);

  // Drop any cached render belonging to the account that no longer exists,
  // matching what the other actions in this file do. Without it a cached RSC
  // payload for a deleted user could still be served.
  revalidatePath("/account");
  revalidatePath("/dashboard");

  await clearSessionCookie();
  redirect("/?deleted=1");
}

/**
 * Admin only manual grant. Used to provision Pro for selected users without a
 * payment (for example partner schools or comped accounts). Gated strictly on
 * the caller's role so a normal student can never grant themselves Pro.
 */
export async function adminGrantProAction(targetEmail: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }

  const email = (targetEmail || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Email is required." };

  initDB();
  const db = getDB();
  const result = db.prepare("UPDATE users SET plan = 'pro' WHERE email = ?").run(email);
  if (result.changes === 0) {
    return { ok: false, error: "No user found with that email." };
  }
  revalidatePath("/account");
  revalidatePath("/dashboard");
  return { ok: true };
}
