/**
 * Manually grant or revoke Pro for a user by email.
 *
 *   npm run grant-pro -- student@example.com         # grant Pro
 *   npm run grant-pro -- student@example.com free    # revert to Free
 *   npm run grant-pro -- student@example.com admin   # mark as admin (role)
 *
 * Use this for comped accounts or to provision the first admin. It operates on
 * the SQLite database the site actually serves from, so on a deployed host run
 * it there (against the mounted volume), not on a workstation copy.
 */

import { getDB, initDB } from "../lib/db/sqlite";

const email = (process.argv[2] || "").trim().toLowerCase();
const arg = (process.argv[3] || "pro").trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run grant-pro -- <email> [pro|free|admin]");
  process.exit(1);
}

initDB();
const db = getDB();

const user = db.prepare("SELECT id, email, role, plan FROM users WHERE email = ?").get(email) as
  | { id: string; email: string; role: string; plan: string }
  | undefined;

if (!user) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

if (arg === "admin") {
  db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
  console.log(`${email} is now an admin.`);
} else if (arg === "free") {
  db.prepare("UPDATE users SET plan = 'free' WHERE id = ?").run(user.id);
  console.log(`${email} reverted to Free.`);
} else {
  db.prepare("UPDATE users SET plan = 'pro' WHERE id = ?").run(user.id);
  console.log(`${email} upgraded to Pro.`);
}
