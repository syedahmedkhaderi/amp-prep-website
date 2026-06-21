"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
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
