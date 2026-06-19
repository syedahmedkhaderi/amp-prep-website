"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getDB, initDB } from "@/lib/db/sqlite";

export async function upgradeAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  initDB();
  const db = getDB();
  db.prepare("UPDATE users SET plan = 'pro' WHERE id = ?").run(user.id);
  revalidatePath("/account");
  revalidatePath("/dashboard");
}

export async function downgradeAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  initDB();
  const db = getDB();
  db.prepare("UPDATE users SET plan = 'free' WHERE id = ?").run(user.id);
  revalidatePath("/account");
  revalidatePath("/dashboard");
}
