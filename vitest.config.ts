import { defineConfig } from "vitest/config";
import path from "path";
import os from "os";

/**
 * Tests get their own database file.
 *
 * Several suites create users, topics and attempts through the real data layer,
 * which is the point — they are testing the real queries. But lib/db/sqlite.ts
 * resolves its path from the working directory, so those fixtures were being
 * written into data/amp-prep.db, the database the development server serves
 * from. It had collected 105 orphan topic rows that way.
 *
 * Pointing AMP_DB_PATH at a temp file keeps the fixtures out of the real
 * database. The file is per-run, so suites also stop inheriting each other's
 * leftovers between runs.
 */
const testDbPath = path.join(os.tmpdir(), `amp-test-${process.pid}.db`);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    globals: true,
    env: {
      AMP_DB_PATH: testDbPath,
    },
    /**
     * Run the suites in one process, one after another.
     *
     * AMP_DB_PATH above is resolved once, in this config, so every worker
     * inherits the same filename. With file-level parallelism the suites that
     * write through the real data layer then share one SQLite file:
     * account-deletion drops users while another suite is mid-transaction, and
     * the run fails intermittently on a foreign key that is fine in isolation.
     *
     * Giving each worker its own file would need the path resolved at runtime
     * rather than here. Serialising is the smaller change and costs about a
     * second on a suite this size, which is worth paying for a deterministic
     * result.
     */
    fileParallelism: false,
  },
});
