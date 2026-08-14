/**
 * End-to-end check of the account deletion promised by the Privacy Policy.
 *
 * Asserts against the database directly, not just the UI, because the claim
 * being tested is that the rows are gone. Also covers the negative case: a
 * wrong password must not delete anything.
 *
 * Writes directly to data/amp-prep.db: development database only. It creates
 * and deletes users and clears rate-limit rows, so never point BASE_URL at a
 * live deployment.
 *
 * Run from the project root, with the dev server already running:
 *   npm run dev
 *   node tests/e2e/account-deletion.mjs
 *
 * Needs a browser once: npx playwright install chromium
 */

import { chromium } from "playwright";
import Database from "better-sqlite3";

// Override when the dev server is not on the default port, e.g.
//   BASE_URL=http://localhost:3001 node tests/e2e/account-deletion.mjs
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const email = `e2e_${Math.random().toString(36).slice(2, 10)}@example.com`;
const password = "a strong enough password";

const db = new Database("data/amp-prep.db", { readonly: true });
const userCount = (e) =>
  db.prepare("SELECT COUNT(*) AS n FROM users WHERE email = ?").get(e).n;

const browser = await chromium.launch();
const page = await browser.newPage();
const fails = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
  if (!ok) fails.push(name);
};

page.on("pageerror", (e) => fails.push(`pageerror: ${e.message}`));

// 1. Sign up
await page.goto(`${BASE}/signup`);
await page.fill('input[name="fullName"]', "E2E Delete");
await page.fill('input[name="email"]', email);
await page.fill('input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard/, { timeout: 15000 });
check("sign up lands on dashboard", page.url().includes("/dashboard"));
check("user row created", userCount(email) === 1);

// 2. Account page shows the delete section
await page.goto(`${BASE}/account`);
check(
  "account page offers deletion",
  await page.getByRole("button", { name: /delete my account/i }).isVisible()
);

// 3. Wrong password is rejected and does NOT delete
await page.getByRole("button", { name: /delete my account/i }).click();
await page.fill('input[name="password"]', "definitely wrong");
await page.getByRole("button", { name: /permanently delete/i }).click();
await page.waitForSelector('[role="alert"]', { timeout: 10000 });
check("wrong password shows an error", await page.locator('[role="alert"]').isVisible());
check("wrong password did NOT delete the account", userCount(email) === 1);

// 4. Correct password deletes
await page.fill('input[name="password"]', password);
await page.getByRole("button", { name: /permanently delete/i }).click();
await page.waitForURL((u) => !u.pathname.startsWith("/account"), { timeout: 15000 });
check("redirected away from account", !page.url().includes("/account"));
check("user row deleted", userCount(email) === 0, `count=${userCount(email)}`);

// 5. Session is cleared: /account must bounce to sign in
await page.goto(`${BASE}/account`);
check("session cleared, /account redirects to sign in", page.url().includes("/signin"));

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILURE(S): ${fails.join(", ")}` : "\nALL PASSED");
process.exit(fails.length ? 1 : 0);
