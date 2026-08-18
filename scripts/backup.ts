/**
 * Take a consistent snapshot of the live database.
 *
 *   npm run backup                      # writes to backups/
 *   npm run backup -- /tmp/scratch.db   # writes to an explicit path
 *
 * Uses SQLite's `VACUUM INTO`, which is the only correct way to copy this
 * database while the site is serving. The database runs in WAL mode, so
 * committed transactions live in `amp-prep.db-wal` until they are checkpointed:
 * copying `amp-prep.db` on its own with `cp` gives you a file that is missing
 * every recent write, and possibly a torn one. `VACUUM INTO` takes a read lock,
 * folds the WAL in, and writes a single defragmented file that is a complete
 * database on its own.
 *
 * The snapshot is written to a temporary name and renamed only on success, so
 * an interrupted run can never leave a half-written file looking like a good
 * backup.
 *
 * A backup you have never restored is not a backup. Verify one:
 *
 *   npm run backup -- /tmp/verify.db
 *   node -e 'const d=require("better-sqlite3")("/tmp/verify.db",{readonly:true});
 *    console.log(d.prepare("select count(*) c from users").get(),
 *                d.prepare("select count(*) c from paper_questions").get());'
 *
 * On Fly, run this over SSH and copy the result off the volume — a snapshot
 * that only exists on the disk it is protecting is not protecting anything:
 *
 *   fly ssh console -C "sh -c 'cd /app && npm run backup'"
 *   fly ssh sftp get /app/backups/<file>.db ./
 */

import * as fs from "fs";
import * as path from "path";
import { getDB, initDB } from "../lib/db/sqlite";

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const target = path.resolve(
  process.argv[2] || path.join(process.cwd(), "backups", `amp-prep-${stamp}.db`)
);

if (fs.existsSync(target)) {
  console.error(`Refusing to overwrite an existing file: ${target}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(target), { recursive: true });

// VACUUM INTO cannot write to a path that already exists, which is also why the
// temporary name is cleaned up before use.
const tmp = `${target}.partial`;
if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

initDB();
const db = getDB();

const before = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };

try {
  db.prepare("VACUUM INTO ?").run(tmp);
} catch (err) {
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  console.error(`Backup failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

fs.renameSync(tmp, target);

const size = (fs.statSync(target).size / (1024 * 1024)).toFixed(1);
console.log(`[backup] ${target}`);
console.log(`[backup] ${size} MB, ${before.c} users`);
console.log(`[backup] Copy this off the volume. A snapshot on the disk it protects is not a backup.`);
