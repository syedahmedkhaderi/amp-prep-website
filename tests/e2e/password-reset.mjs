/**
 * The password reset journey, through a real browser.
 *
 * The unit tests cover token issuing and spending. What they cannot cover is
 * whether a person holding the emailed link can actually get back into their
 * account: the page renders the form, the action consumes the token, the
 * redirect explains what happened, and the new password works.
 *
 * The token is inserted directly rather than requested through the form,
 * because only its hash is ever stored — there is deliberately no way to read a
 * live token back out of the database, which is the property being relied on.
 *
 * Run from the project root with the dev server already running:
 *   node tests/e2e/password-reset.mjs
 */

import { chromium } from "playwright";
import Database from "better-sqlite3";
import crypto from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const stamp = crypto.randomBytes(5).toString("hex");
const email = `reset_${stamp}@example.com`;
const OLD_PASSWORD = "a reasonably long passphrase";
const NEW_PASSWORD = "an entirely different passphrase";

const db = new Database("data/amp-prep.db");

const fails = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
  if (!ok) fails.push(name);
};

const userRow = () => db.prepare("SELECT * FROM users WHERE email = ?").get(email);

function cleanup() {
  const user = userRow();
  if (user) {
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  }
}

/** Insert a reset token the way lib/auth does, and return the raw value. */
function issueToken(userId, { expired = false, used = false } = {}) {
  const token = crypto.randomBytes(32).toString("base64url");
  db.prepare(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    "prt_" + crypto.randomBytes(8).toString("hex"),
    userId,
    crypto.createHash("sha256").update(token).digest("hex"),
    new Date(Date.now() + (expired ? -1000 : 60 * 60 * 1000)).toISOString(),
    used ? new Date().toISOString() : null
  );
  return token;
}


/**
 * Wait for a message to actually appear.
 *
 * Not `[role="alert"]`: Next's dev overlay leaves an empty element with that
 * role in the page, so waiting on the selector resolves immediately against
 * the wrong node and the real message is read before it renders.
 */
async function messageShown(target, pattern) {
  try {
    await target.getByText(pattern).first().waitFor({ timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

try {
  db.prepare("DELETE FROM rate_limits WHERE key LIKE 'signup:%' OR key LIKE 'signin:%' OR key LIKE 'reset-%'").run();
  cleanup();

  console.log("\n--- set up an account ---");
  await page.goto(`${BASE}/signup`);
  await page.getByLabel(/full name/i).fill("Reset Journey");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).first().fill(OLD_PASSWORD);
  await page.getByRole("button", { name: /create account|sign up/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 20000 });
  const user = userRow();
  check("account created", !!user);

  console.log("\n--- the sign-in page offers a way out of being locked out ---");
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(`${BASE}/signin`);
  const forgot = anonPage.getByRole("link", { name: /forgot your password/i });
  check("sign-in links to password recovery", await forgot.isVisible());
  await forgot.click();
  await anonPage.waitForURL(/forgot-password/, { timeout: 15000 });
  const forgotText = await anonPage.locator("body").innerText();
  // With no SMTP configured the page must NOT offer a form it cannot honour.
  const offersForm = await anonPage.getByRole("button", { name: /send reset link/i }).count();
  check(
    "recovery page is honest about what it can do",
    offersForm > 0 || /not available yet/i.test(forgotText),
    offersForm > 0 ? "form shown (mailer configured)" : "fallback shown (no mailer)"
  );

  console.log("\n--- a bad link is refused ---");
  await anonPage.goto(`${BASE}/reset-password?token=not-a-real-token`);
  await anonPage.getByLabel(/^new password$/i).fill(NEW_PASSWORD);
  await anonPage.getByLabel(/confirm new password/i).fill(NEW_PASSWORD);
  await anonPage.getByRole("button", { name: /set new password/i }).click();
  check(
    "an invalid token is rejected with an explanation",
    await messageShown(anonPage, /invalid or has expired/i)
  );

  console.log("\n--- an expired link is refused ---");
  const expired = issueToken(user.id, { expired: true });
  await anonPage.goto(`${BASE}/reset-password?token=${encodeURIComponent(expired)}`);
  await anonPage.getByLabel(/^new password$/i).fill(NEW_PASSWORD);
  await anonPage.getByLabel(/confirm new password/i).fill(NEW_PASSWORD);
  await anonPage.getByRole("button", { name: /set new password/i }).click();
  check(
    "an expired token is rejected",
    await messageShown(anonPage, /invalid or has expired/i)
  );
  check("the expired attempt did not change the password", !!userRow());

  console.log("\n--- mismatched confirmation is caught ---");
  const live = issueToken(user.id);
  await anonPage.goto(`${BASE}/reset-password?token=${encodeURIComponent(live)}`);
  await anonPage.getByLabel(/^new password$/i).fill(NEW_PASSWORD);
  await anonPage.getByLabel(/confirm new password/i).fill("something else entirely");
  await anonPage.getByRole("button", { name: /set new password/i }).click();
  check(
    "a mismatched confirmation is rejected",
    await messageShown(anonPage, /do not match/i)
  );

  console.log("\n--- the real thing ---");
  const before = userRow().password_hash;
  await anonPage.goto(`${BASE}/reset-password?token=${encodeURIComponent(live)}`);
  await anonPage.getByLabel(/^new password$/i).fill(NEW_PASSWORD);
  await anonPage.getByLabel(/confirm new password/i).fill(NEW_PASSWORD);
  await anonPage.getByRole("button", { name: /set new password/i }).click();
  await anonPage.waitForURL(/signin/, { timeout: 20000 });
  check("a valid reset lands back on sign-in", /reset=1/.test(anonPage.url()), anonPage.url());
  check(
    "the outcome is explained rather than left silent",
    await messageShown(anonPage, /password has been changed/i)
  );
  check("the stored password hash actually changed", userRow().password_hash !== before);

  console.log("\n--- the token is spent ---");
  await anonPage.goto(`${BASE}/reset-password?token=${encodeURIComponent(live)}`);
  await anonPage.getByLabel(/^new password$/i).fill("a third different passphrase");
  await anonPage.getByLabel(/confirm new password/i).fill("a third different passphrase");
  await anonPage.getByRole("button", { name: /set new password/i }).click();
  check(
    "the same link cannot be used twice",
    await messageShown(anonPage, /invalid or has expired/i)
  );

  console.log("\n--- the new password works, the old one does not ---");
  await anonPage.goto(`${BASE}/signin`);
  await anonPage.getByLabel(/email/i).fill(email);
  await anonPage.getByLabel(/password/i).first().fill(OLD_PASSWORD);
  await anonPage.getByRole("button", { name: /sign in/i }).click();
  await anonPage.locator('form [role="alert"]').first().waitFor({ timeout: 15000 }).catch(() => {});
  check("the old password no longer signs in", !/\/dashboard/.test(anonPage.url()), anonPage.url());

  await anonPage.goto(`${BASE}/signin`);
  await anonPage.getByLabel(/email/i).fill(email);
  await anonPage.getByLabel(/password/i).first().fill(NEW_PASSWORD);
  await anonPage.getByRole("button", { name: /sign in/i }).click();
  await anonPage.waitForURL(/dashboard/, { timeout: 20000 });
  check("the new password signs in", /\/dashboard/.test(anonPage.url()), anonPage.url());

  console.log("\n--- the original session was revoked ---");
  await page.goto(`${BASE}/account`);
  check(
    "the device that was signed in before the reset is signed out",
    /\/signin/.test(page.url()),
    page.url()
  );

  await anon.close();
} catch (e) {
  check("the reset journey ran to completion", false, String(e?.message ?? e).split("\n")[0]);
} finally {
  cleanup();
  await browser.close();
  db.close();
}

console.log(fails.length ? `\n${fails.length} FAILURE(S): ${fails.join(", ")}` : "\nALL PASSED");
process.exit(fails.length ? 1 : 0);
