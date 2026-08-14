/**
 * End-to-end checks for the auth hardening: password floor at signup, rate
 * limiting on sign-in, password change, and session revocation across devices.
 *
 * Uses two independent browser contexts to represent two devices, because the
 * claim being tested — "changing your password signs out your other devices" —
 * cannot be observed from a single session.
 *
 * Writes directly to data/amp-prep.db: development database only. It creates
 * and deletes users and clears rate-limit rows, so never point BASE_URL at a
 * live deployment.
 *
 * Run from the project root, with the dev server already running:
 *   npm run dev
 *   node tests/e2e/auth-hardening.mjs
 *
 * Needs a browser once: npx playwright install chromium
 */

import { chromium } from "playwright";
import Database from "better-sqlite3";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const email = `hard_${Math.random().toString(36).slice(2, 10)}@example.com`;
const password = "correct horse battery staple";
const newPassword = "a completely different phrase";

const db = new Database("data/amp-prep.db");
const fails = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
  if (!ok) fails.push(name);
};

// Repeated runs from the same address would otherwise exhaust the signup limit
// and fail the setup rather than the behaviour under test.
db.prepare("DELETE FROM rate_limits WHERE key LIKE 'signup:%' OR key LIKE 'signin:%'").run();

const browser = await chromium.launch();

async function signUp(page, pw) {
  await page.goto(`${BASE}/signup`);
  await page.fill('input[name="fullName"]', "Hardening Test");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', pw);
  await page.click('button[type="submit"]');
}

async function signIn(page, pw, addr = email) {
  await page.goto(`${BASE}/signin`);
  await page.fill('input[name="email"]', addr);
  await page.fill('input[name="password"]', pw);
  await page.click('button[type="submit"]');
}

// 1. Weak password is rejected at signup
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signUp(page, "pass123");
  await page.waitForTimeout(1500);
  check("weak password rejected at signup", !page.url().includes("/dashboard"));
  check(
    "no account created for weak password",
    db.prepare("SELECT COUNT(*) AS n FROM users WHERE email = ?").get(email).n === 0
  );
  await ctx.close();
}

// 2. Strong password is accepted
const deviceA = await browser.newContext();
const pageA = await deviceA.newPage();
await signUp(pageA, password);
await pageA.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {});
check("strong password accepted", pageA.url().includes("/dashboard"));

// 3. Second device signs in with the same account
const deviceB = await browser.newContext();
const pageB = await deviceB.newPage();
await signIn(pageB, password);
await pageB.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {});
check("second device can sign in", pageB.url().includes("/dashboard"));

// 4. Device A changes the password
await pageA.goto(`${BASE}/account`);
await pageA.fill('input[name="currentPassword"]', password);
await pageA.fill('input[name="newPassword"]', newPassword);
await pageA.fill('input[name="confirmPassword"]', newPassword);
await pageA.getByRole("button", { name: /change password/i }).click();
// Wait for the outcome text itself. Waiting on [role="status"] instead matches
// the Next.js dev overlay, which is present from page load, so the assertion
// would run before the action had returned.
const outcome = await Promise.race([
  pageA
    .getByText(/Password changed/i)
    .waitFor({ timeout: 20000 })
    .then(() => "ok"),
  pageA
    .locator('form [role="alert"]')
    .waitFor({ timeout: 20000 })
    .then(() => "error"),
]).catch(() => "timeout");
check("password change reported success", outcome === "ok", `outcome=${outcome}`);

// 5. Device A stays signed in
await pageA.goto(`${BASE}/account`);
check("device that changed the password stays signed in", pageA.url().includes("/account"));

// 6. Device B is signed out — the whole point of token_version
await pageB.goto(`${BASE}/account`);
check("other device is signed out after password change", pageB.url().includes("/signin"));

// 7. Old password no longer works
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, password);
  await page.waitForTimeout(1500);
  check("old password rejected", !page.url().includes("/dashboard"));
  await ctx.close();
}

// 8. Rate limiting kicks in on repeated failures
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let limited = false;
  for (let i = 0; i < 12; i++) {
    await signIn(page, `wrong-guess-${i}`);
    await page.waitForTimeout(300);
    const body = await page.textContent("body");
    if (body.includes("Too many attempts")) {
      limited = true;
      break;
    }
  }
  check("repeated wrong passwords get rate limited", limited);
  await ctx.close();
}

// 9. security.txt is served
{
  const res = await fetch(`${BASE}/.well-known/security.txt`);
  const body = res.ok ? await res.text() : "";
  check("security.txt served", res.ok && body.includes("Contact:"), `status=${res.status}`);
}

// Cleanup
db.prepare("DELETE FROM users WHERE email = ?").run(email);
db.prepare("DELETE FROM rate_limits WHERE key LIKE ?").run(`signin:account:${email}`);

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILURE(S): ${fails.join(", ")}` : "\nALL PASSED");
process.exit(fails.length ? 1 : 0);
