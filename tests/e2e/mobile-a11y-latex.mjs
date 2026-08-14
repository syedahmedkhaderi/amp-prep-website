/**
 * The second pass: the things a functional assertion cannot see.
 *
 *   1. Mobile at 375px. A page that scrolls sideways on a phone is broken even
 *      though every element on it "rendered". Measured as page-level horizontal
 *      overflow, not per element, because display math and the mock rail are
 *      deliberately scrollable inside their own containers.
 *   2. Keyboard navigation. The skip link, tab order into the real controls,
 *      and a visible focus indicator.
 *   3. LaTeX, verified by looking rather than by parsing. Questions are pulled
 *      from a spread of topics inside the real practice runner and checked for
 *      two distinct failure modes: KaTeX's red error output, and raw LaTeX
 *      source that reached the screen without being rendered at all. The dev
 *      renderer throws on a parse error and falls back to printing the source,
 *      so the second check is the one that catches a broken question here.
 *
 * Screenshots land in SHOT_DIR (override with SCREENSHOT_DIR) so a failure can
 * be looked at rather than argued about.
 *
 * Writes directly to data/amp-prep.db: development database only. It creates
 * and deletes a user and clears rate-limit rows, so never point BASE_URL at a
 * live deployment.
 *
 * Run from the project root, with the dev server already running:
 *   npm run dev
 *   node tests/e2e/mobile-a11y-latex.mjs
 *
 * Needs a browser once: npx playwright install chromium
 */

import { chromium } from "playwright";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = process.env.SCREENSHOT_DIR ?? "/tmp/amp-e2e-shots";
const stamp = Math.random().toString(36).slice(2, 10);
const email = `mv_${stamp}@example.com`;
const password = "a reasonably long passphrase";

mkdirSync(SHOT_DIR, { recursive: true });

const db = new Database("data/amp-prep.db");
const fails = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
  if (!ok) fails.push(name);
};
async function step(title, fn) {
  console.log(`\n--- ${title} ---`);
  try {
    await fn();
  } catch (e) {
    check(`${title} ran to completion`, false, String(e?.message ?? e).split("\n")[0]);
  }
}

db.prepare("DELETE FROM rate_limits WHERE key LIKE 'signup:%' OR key LIKE 'signin:%'").run();

/** Page-level horizontal overflow, plus the widest thing that causes it. */
const overflowReport = () =>
  ({
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    clientWidth: document.documentElement.clientWidth,
    worst: (() => {
      let worst = null;
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > window.innerWidth + 1 && (!worst || r.right > worst.right)) {
          worst = {
            right: Math.round(r.right),
            tag: el.tagName.toLowerCase(),
            cls: String(el.className).slice(0, 60),
          };
        }
      }
      return worst;
    })(),
  });

const browser = await chromium.launch();
let userId = null;

/** Sign up in the given context and return once the dashboard is up. */
async function signUp(page) {
  await page.goto(`${BASE}/signup`);
  await page.fill('input[name="fullName"]', "Mobile Sweep");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 25000 });
  userId = db.prepare("SELECT id FROM users WHERE email = ?").get(email)?.id ?? null;
}

try {
  // =========================================================================
  // 1. Mobile, 375px
  // =========================================================================
  await step("mobile 375px: no horizontal overflow", async () => {
    // `viewport`, not `viewportSize`: the latter is the Python binding's name
    // and is silently ignored here, which would run the whole check at the
    // default 1280px and report a false pass.
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    await signUp(page);

    // Measured against a real page, not about:blank: an unnavigated page
    // reports the default window size and would report a false 981px here.
    // This assertion is the guard on every overflow result below -- if the
    // context silently fell back to the desktop default, the whole check would
    // pass while testing nothing.
    const width = await page.evaluate(() => window.innerWidth);
    check("mobile context really is 375px wide", width === 375, `innerWidth=${width}`);

    // A practice attempt and a mock so the runners are measured too, not just
    // the static pages.
    await page.goto(`${BASE}/practice/start/fractions`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/practice\/runner\//, { timeout: 25000 }).catch(() => {});
    const practiceUrl = page.url();

    await page.goto(`${BASE}/mock`, { waitUntil: "domcontentloaded" });
    let mockUrl = null;
    const start = await page.$('a[href^="/mock/start/"]');
    if (start) {
      await start.click();
      await page.waitForURL(/\/mock\/runner\//, { timeout: 60000 }).catch(() => {});
      if (/\/mock\/runner\//.test(page.url())) mockUrl = page.url();
    }
    check("a mock runner was reachable to measure", !!mockUrl, String(mockUrl));

    const routes = [
      "/",
      "/pricing",
      "/about",
      "/faq",
      "/terms",
      "/privacy",
      "/contact",
      "/signin",
      "/signup",
      "/dashboard",
      "/topics",
      "/topics/fractions",
      "/account",
      `/definitely-not-a-real-page-${stamp}`,
      practiceUrl.replace(BASE, ""),
      ...(mockUrl ? [mockUrl.replace(BASE, "")] : []),
    ];

    const overflowing = [];
    for (const route of routes) {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700); // KaTeX renders after hydration
      const r = await page.evaluate(overflowReport);
      if (r.scrollWidth > r.clientWidth + 1) {
        overflowing.push(
          `${route} (${r.scrollWidth}>${r.clientWidth}${r.worst ? ` worst=${r.worst.tag}.${r.worst.cls}@${r.worst.right}` : ""})`
        );
        await page.screenshot({
          path: join(SHOT_DIR, `overflow-${route.replace(/\W+/g, "_") || "root"}.png`),
          fullPage: true,
        });
      }
    }
    check(
      `no page-level horizontal overflow at 375px across ${routes.length} pages`,
      overflowing.length === 0,
      overflowing.join(" | ")
    );

    // The mobile menu is the only way to the nav at this width, so it has to work.
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const toggle = page.getByRole("button", { name: /open menu/i });
    check("a mobile menu toggle is offered at 375px", await toggle.isVisible());
    await toggle.click();
    check(
      "the mobile menu opens and exposes the nav",
      await page.locator("#mobile-menu a[href='/about']").isVisible()
    );
    await page.screenshot({ path: join(SHOT_DIR, "mobile-menu-open.png") });

    await ctx.close();
  });

  // =========================================================================
  // 2. Keyboard navigation
  // =========================================================================
  await step("keyboard navigation", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);

    await page.keyboard.press("Tab");
    const firstStop = await page.evaluate(() => {
      const el = document.activeElement;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        href: el.getAttribute?.("href"),
        text: el.textContent?.trim().slice(0, 40),
        onScreen: r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0,
        outline: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
      };
    });
    check(
      "the first tab stop is the skip link",
      firstStop.href === "#main-content",
      `${firstStop.tag} ${firstStop.href} ${JSON.stringify(firstStop.text)}`
    );
    check(
      "the skip link becomes visible when focused",
      firstStop.onScreen,
      JSON.stringify(firstStop)
    );

    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    check("activating the skip link targets the main content", page.url().endsWith("#main-content"), page.url());
    check("the skip link target exists on the page", (await page.locator("#main-content").count()) === 1);

    // Tab through the header and confirm the nav is reachable, not just present.
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    const reached = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const stop = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        // <nextjs-portal> is the dev overlay's host element. It is focusable
        // and invisible, and it does not exist in a production build.
        if (el.tagName.toLowerCase() === "nextjs-portal") return null;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          href: el.getAttribute?.("href"),
          text: el.textContent?.trim().slice(0, 30),
          // A focus indicator is either an outline or a ring drawn with a
          // box-shadow; Tailwind uses both depending on the control.
          hasIndicator:
            (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) ||
            (cs.boxShadow !== "none" && cs.boxShadow !== ""),
          visible: r.width > 0 && r.height > 0,
        };
      });
      if (stop) reached.push(stop);
    }
    const hrefs = reached.map((s) => s.href).filter(Boolean);
    check("tabbing reaches multiple interactive controls", reached.length >= 6, `${reached.length} stops`);
    check("tab order reaches the sign-in link", hrefs.includes("/signin"), hrefs.join(", "));
    check("tab order reaches the primary call to action", hrefs.includes("/signup"), hrefs.join(", "));
    check(
      "every keyboard stop is a visible element",
      reached.every((s) => s.visible),
      reached.filter((s) => !s.visible).map((s) => s.tag).join(", ")
    );
    const noIndicator = reached.filter((s) => !s.hasIndicator);
    check(
      "every focused control shows a focus indicator",
      noIndicator.length === 0,
      noIndicator.map((s) => `${s.tag}[${s.href ?? s.text}]`).join(", ")
    );

    // The sign-in form must be completable without a mouse.
    await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await page.locator('input[name="email"]').focus();
    await page.keyboard.type("keyboard@example.com");
    await page.keyboard.press("Tab");
    const afterEmail = await page.evaluate(() => document.activeElement?.getAttribute("name"));
    check("tab moves from the email field to the password field", afterEmail === "password", String(afterEmail));

    await ctx.close();
  });

  // =========================================================================
  // 3. LaTeX, verified visually across a spread of topics
  // =========================================================================
  await step("LaTeX renders across a spread of topics", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/signin`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 25000 });

    // A spread rather than one topic: the failure modes differ by content.
    // Fractions and exponents exercise \frac and superscripts, trigonometry and
    // logarithms exercise operator names, word problems exercise the currency
    // dollar sign that must NOT be treated as a math delimiter.
    const topics = [
      "fractions",
      "laws-of-exponents",
      "trigonometry",
      "logarithms",
      "rational-expressions",
      "geometry",
      "word-problems",
    ];

    let inspected = 0;
    const katexErrors = [];
    const rawLatex = [];

    for (const slug of topics) {
      await page.goto(`${BASE}/practice/start/${slug}`, { waitUntil: "domcontentloaded" });
      await page.waitForURL(/\/practice\/runner\//, { timeout: 25000 }).catch(() => {});
      if (!/\/practice\/runner\//.test(page.url())) {
        check(`practice runner opened for ${slug}`, false, page.url());
        continue;
      }
      await page.waitForSelector("text=/Question 1 of/", { timeout: 25000 });
      const total = Number((await page.locator("main").innerText()).match(/Question 1 of (\d+)/)?.[1] ?? 0);

      for (let q = 0; q < total; q++) {
        await page.waitForTimeout(250); // let KaTeX finish this question
        const card = page.locator("main .rounded-2xl").first();

        const report = await card.evaluate((el) => {
          // KaTeX keeps a MathML copy and a \tex annotation in the DOM for
          // assistive tech. Both contain the source, so they are stripped
          // before reading text -- otherwise every rendered formula would look
          // like a raw-LaTeX failure.
          const clone = el.cloneNode(true);
          for (const n of clone.querySelectorAll(".katex-mathml, annotation")) n.remove();
          const visibleText = clone.textContent ?? "";
          const errorNodes = [...el.querySelectorAll(".katex-error")].map((n) => n.textContent?.slice(0, 80));
          const redNodes = [...el.querySelectorAll("*")]
            .filter((n) => getComputedStyle(n).color === "rgb(220, 38, 38)")
            .map((n) => n.textContent?.slice(0, 60));
          return {
            visibleText,
            errorNodes,
            redNodes,
            katexCount: el.querySelectorAll(".katex").length,
            stem: el.querySelector("div.text-base")?.textContent?.slice(0, 80) ?? "",
          };
        });

        inspected++;
        if (report.errorNodes.length || report.redNodes.length) {
          katexErrors.push(`${slug} q${q + 1}: ${[...report.errorNodes, ...report.redNodes].join(" | ")}`);
        }
        // A backslash-command or a lone brace group that survived into visible
        // text means the renderer printed source instead of a formula.
        const raw = report.visibleText.match(/\\(frac|times|cdot|sqrt|left|right|begin|log|sin|cos|tan|pi|div|pm|le|ge|ne)\b/);
        if (raw) rawLatex.push(`${slug} q${q + 1}: ${raw[0]} in ${JSON.stringify(report.stem)}`);
        // A stray delimiter is only a bug when it is unpaired; a single $ in
        // "costs $48" is correct and deliberate, two are not.
        const dollars = (report.visibleText.match(/\$/g) ?? []).length;
        if (dollars >= 2) rawLatex.push(`${slug} q${q + 1}: ${dollars} stray $ in ${JSON.stringify(report.stem)}`);

        if (q < 3) {
          await page.screenshot({
            path: join(SHOT_DIR, `latex-${slug}-q${q + 1}.png`),
            clip: await card.boundingBox().then((b) =>
              b ? { x: b.x, y: b.y, width: b.width, height: Math.min(b.height, 900) } : undefined
            ),
          });
        }
        if (q < total - 1) await page.getByRole("button", { name: /^(Next|Finish)$/ }).click();
      }
    }

    check(`inspected questions across ${topics.length} topics`, inspected >= 50, `${inspected} questions`);
    check("no KaTeX error output is visible to the user", katexErrors.length === 0, katexErrors.slice(0, 5).join(" | "));
    check("no raw LaTeX source reaches the screen", rawLatex.length === 0, rawLatex.slice(0, 5).join(" | "));

    // Prove the check can fail: a deliberately broken formula must be caught.
    await page.setContent(
      `<div id="probe">Solve \\frac{1}{2} + \\times</div>`
    );
    const probe = await page.locator("#probe").evaluate((el) => el.textContent);
    check(
      "the raw-LaTeX detector matches raw source when it is present",
      /\\(frac|times)\b/.test(probe)
    );

    console.log(`screenshots written to ${SHOT_DIR}`);
    await ctx.close();
  });
} finally {
  if (userId) {
    const attemptIds = db.prepare("SELECT id FROM attempts WHERE user_id = ?").all(userId).map((r) => r.id);
    for (const id of attemptIds) {
      db.prepare("DELETE FROM attempt_answers WHERE attempt_id = ?").run(id);
      db.prepare("DELETE FROM attempt_questions WHERE attempt_id = ?").run(id);
    }
    db.prepare("DELETE FROM attempts WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM question_reports WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  }
  db.prepare("DELETE FROM rate_limits WHERE key = ?").run(`signin:account:${email}`);
  await browser.close();
}

console.log(fails.length ? `\n${fails.length} FAILURE(S): ${fails.join(", ")}` : "\nALL PASSED");
process.exit(fails.length ? 1 : 0);
