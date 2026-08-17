/**
 * Full functional sweep of the signed-out and signed-in product, driven through
 * a real browser.
 *
 * The point of this file is coverage of the paths a student actually walks:
 * sign up, look at the dashboard, pick a topic, practise it to the end, sit a
 * timed mock, submit it, read the review, then look at the account page. Unit
 * tests already cover the pieces; what they cannot tell you is whether the
 * pieces are reachable from a browser in that order.
 *
 * Two things are enumerated from disk rather than listed here on purpose:
 *
 *   - every app/(app) page, checked to redirect a signed-out visitor
 *   - every app/api route and its exported methods, checked to refuse one
 *
 * and the header/footer links are crawled out of the rendered DOM. A route or
 * link added later is therefore covered without anyone remembering to add it,
 * which is the failure mode a hardcoded list has.
 *
 * Every stage runs inside step(), so one broken stage is reported and the rest
 * of the sweep still runs. The account created for the run is always removed,
 * including after a crash, so reruns start clean.
 *
 * Writes directly to data/amp-prep.db: development database only. It creates
 * and deletes a user, flips that user's plan, and clears rate-limit rows, so
 * never point BASE_URL at a live deployment.
 *
 * Run from the project root, with the dev server already running:
 *   npm run dev
 *   node tests/e2e/functional.mjs
 *
 * Needs a browser once: npx playwright install chromium
 */

import { chromium } from "playwright";
import Database from "better-sqlite3";
import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ORIGIN = new URL(BASE).origin;
const stamp = Math.random().toString(36).slice(2, 10);
const email = `fn_${stamp}@example.com`;
const password = "a reasonably long passphrase";
const fullName = "Functional Sweep";

const db = new Database("data/amp-prep.db");

const fails = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
  if (!ok) fails.push(name);
};

/** Run one stage. A throw is a failure of that stage, not of the whole sweep. */
async function step(title, fn) {
  console.log(`\n--- ${title} ---`);
  try {
    await fn();
  } catch (e) {
    check(`${title} ran to completion`, false, String(e?.message ?? e).split("\n")[0]);
  }
}

// Repeated runs from the same address would otherwise exhaust the signup limit
// and fail the setup rather than the behaviour under test.
db.prepare("DELETE FROM rate_limits WHERE key LIKE 'signup:%' OR key LIKE 'signin:%'").run();

// ---------------------------------------------------------------------------
// Route enumeration from the filesystem
// ---------------------------------------------------------------------------

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * Placeholder values for dynamic segments. They only have to get far enough
 * into the handler to prove the auth check runs first, so a nonexistent id is
 * the more useful choice: a route that reached the database before checking the
 * session would 500 here instead of refusing.
 */
const SEGMENT_SAMPLES = {
  attemptId: "e2e-nonexistent-attempt",
  slug: "fractions",
  examCode: "AMP1",
  id: "e2e-nonexistent-attempt",
};

const fillSegments = (route) =>
  route.replace(/\[(?:\.\.\.)?([^\]]+)\]/g, (_m, name) => SEGMENT_SAMPLES[name] ?? "e2e");

/** Every page under app/(app), as a URL path. */
const appPageRoutes = () =>
  walk("app/(app)")
    .filter((f) => f.endsWith("/page.tsx"))
    .map((f) => f.replace(/^app\/\(app\)/, "").replace(/\/page\.tsx$/, ""))
    .map((r) => fillSegments(r || "/"))
    .sort();

/** Every route handler under app/api, with the HTTP methods it exports. */
async function apiRoutes() {
  const out = [];
  for (const file of walk("app/api").filter((f) => f.endsWith("/route.ts"))) {
    const source = await readFile(file, "utf8");
    const methods = [
      ...source.matchAll(
        /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g
      ),
    ].map((m) => m[1]);
    out.push({ path: fillSegments(file.replace(/^app/, "").replace(/\/route\.ts$/, "")), methods });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const pageErrors = [];
// `next dev` instruments server component render timings with performance
// marks, and a redirecting page (mock/start) produces a negative measure. It
// is dev-server noise, not application code, and does not exist in a build.
const DEV_NOISE = /cannot have a negative time stamp/i;
page.on("pageerror", (e) => {
  if (DEV_NOISE.test(e.message)) return;
  pageErrors.push(`${new URL(page.url()).pathname}: ${e.message}`);
});

let userId = null;
let practiceAttemptId = null;
let mockAttemptId = null;
const topicSlug = "fractions";

try {
  // =========================================================================
  await step("signed-out access control", async () => {
    const anon = await browser.newContext();
    const anonPage = await anon.newPage();

    const pages = appPageRoutes();
    check("app routes were discovered on disk", pages.length >= 8, `found ${pages.length}`);
    const notRedirected = [];
    for (const route of pages) {
      const res = await anonPage.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      const landed = new URL(anonPage.url()).pathname;
      if (landed !== "/signin" || (res && res.status() >= 500)) {
        notRedirected.push(`${route} -> ${landed} (${res?.status()})`);
      }
    }
    check(
      `all ${pages.length} app/(app) pages redirect a signed-out visitor to /signin`,
      notRedirected.length === 0,
      notRedirected.join("; ")
    );

    const api = await apiRoutes();
    check("api routes were discovered on disk", api.length >= 4, `found ${api.length}`);
    const noMethods = api.filter((r) => r.methods.length === 0).map((r) => r.path);
    check("every api route exports at least one method", noMethods.length === 0, noMethods.join(", "));

    const badApi = [];
    let calls = 0;
    for (const { path, methods } of api) {
      for (const method of methods) {
        calls++;
        const res = await fetch(`${BASE}${path}`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: method === "GET" || method === "HEAD" ? undefined : "{}",
        });
        // 401/403 is the expected refusal. Two routes are deliberately not
        // session-authenticated and are listed here rather than exempted
        // silently, so that adding a third requires saying why.
        //
        //   /api/webhooks/payments -- authenticated by HMAC signature, not by
        //     session. With no provider configured it can only answer 503:
        //     still a refusal, still not a 200 and not a crash.
        //   /api/health -- the host's health check runs unauthenticated, before
        //     any user exists. It answers 200 when the database is seeded and
        //     503 when it is not, and returns two aggregate counts and no user
        //     data of any kind.
        const openRoutes = {
          "/api/webhooks/payments": [401, 403, 503],
          "/api/health": [200, 503],
        };
        const allowed = openRoutes[path] ?? [401, 403];
        if (!allowed.includes(res.status)) badApi.push(`${method} ${path} -> ${res.status}`);
      }
    }
    check(
      `all ${calls} api methods across ${api.length} routes refuse an unauthenticated caller`,
      badApi.length === 0,
      badApi.join("; ")
    );

    await anon.close();
  });

  // =========================================================================
  await step("public pages, legal pages, nav and footer link crawl", async () => {
    const anon = await browser.newContext();
    const anonPage = await anon.newPage();
    const publicErrors = [];
    anonPage.on("pageerror", (e) => publicErrors.push(e.message));

    for (const [route, needle] of [
      ["/terms", /terms/i],
      ["/privacy", /privacy/i],
      ["/contact", /contact/i],
      ["/about", /about|independent/i],
    ]) {
      const res = await anonPage.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      const heading = (await anonPage.locator("h1").first().textContent().catch(() => "")) ?? "";
      check(
        `${route} renders with a matching heading`,
        res?.status() === 200 && needle.test(heading),
        `status=${res?.status()} h1=${JSON.stringify(heading)}`
      );
    }

    const res = await anonPage.goto(`${BASE}/pricing`, { waitUntil: "domcontentloaded" });
    const pricingText = await anonPage.locator("main").innerText();
    check(
      "/pricing shows both plans and a price",
      res?.status() === 200 &&
        /Free/.test(pricingText) &&
        /Pro/.test(pricingText) &&
        /\$10/.test(pricingText)
    );

    // Crawl header and footer links out of the DOM, two levels deep, so a link
    // added to SiteChrome or MarketingNav later is picked up automatically
    // rather than needing to be added to a list here.
    const discovered = new Set();
    const collect = async (route) => {
      await anonPage.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      const hrefs = await anonPage.$$eval("header a[href], footer a[href]", (as) =>
        as.map((a) => a.href)
      );
      for (const href of hrefs) {
        let url;
        try {
          url = new URL(href);
        } catch {
          continue;
        }
        // mailto:, tel: and links to another host are not this app's to serve.
        if (url.origin !== ORIGIN) continue;
        discovered.add(url.pathname);
      }
    };
    await collect("/");
    for (const route of [...discovered]) await collect(route);

    check("header/footer links were found in the DOM", discovered.size >= 5, `found ${discovered.size}`);
    const broken = [];
    for (const route of [...discovered].sort()) {
      const r = await fetch(`${BASE}${route}`, { redirect: "manual" });
      if (r.status !== 200) broken.push(`${route} -> ${r.status}`);
    }
    check(
      `all ${discovered.size} signed-out nav/footer links return 200`,
      broken.length === 0,
      broken.join("; ")
    );

    check("no uncaught page errors on the public pages", publicErrors.length === 0, publicErrors.join("; "));
    await anon.close();
  });

  // =========================================================================
  await step("404 page", async () => {
    const anon = await browser.newContext();
    const anonPage = await anon.newPage();
    const res = await anonPage.goto(`${BASE}/definitely-not-a-real-page-${stamp}`, {
      waitUntil: "domcontentloaded",
    });
    check("unknown URL returns HTTP 404", res?.status() === 404, `status=${res?.status()}`);
    check(
      "unknown URL renders the custom 404 page",
      /does not exist/i.test(await anonPage.locator("body").innerText())
    );
    await anon.close();
  });

  // =========================================================================
  await step("URL-derived metadata", async () => {
    const html = await (await fetch(`${BASE}/`)).text();
    const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1];
    const ogUrl = html.match(/<meta[^>]+property="og:url"[^>]+content="([^"]+)"/)?.[1];
    const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
    const robots = await (await fetch(`${BASE}/robots.txt`)).text();
    const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const robotsSitemap = robots.match(/Sitemap:\s*(\S+)/i)?.[1];

    // Asserted on shape, not on a literal origin: APP_URL is unset locally and
    // the production value is set at deploy time. What must hold either way is
    // that all of these come from the same constant.
    const origins = new Set(
      [canonical, ogUrl, robotsSitemap, ...sitemapUrls].filter(Boolean).map((u) => new URL(u).origin)
    );
    check("canonical link is absolute", !!canonical?.startsWith("http"), String(canonical));
    check("og:url is absolute", !!ogUrl?.startsWith("http"), String(ogUrl));
    check("sitemap.xml lists absolute URLs", sitemapUrls.length >= 5, `${sitemapUrls.length} entries`);
    check("robots.txt points at the sitemap", !!robotsSitemap, String(robotsSitemap));
    check(
      "canonical, og:url, sitemap and robots all derive from one origin",
      origins.size === 1,
      [...origins].join(", ")
    );
    check(
      "robots.txt disallows the signed-in areas",
      /Disallow:\s*\/api\//.test(robots) && /Disallow:\s*\/account/.test(robots)
    );
  });

  // =========================================================================
  await step("sign up and dashboard", async () => {
    await page.goto(`${BASE}/signup`);
    await page.fill('input[name="fullName"]', fullName);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});
    check("sign up lands on the dashboard", page.url().includes("/dashboard"), page.url());

    const row = db.prepare("SELECT id, plan FROM users WHERE email = ?").get(email);
    check("user row was created", !!row);
    check("new user starts on the free plan", row?.plan === "free", `plan=${row?.plan}`);
    userId = row?.id ?? null;

    const text = await page.locator("main").innerText();
    check("dashboard greets the new user by name", text.includes(fullName));
    check("dashboard shows the free-tier practice allowance", /practice questions today/i.test(text));
    check(
      "dashboard shows a real topic count, not a placeholder",
      /Browse \d+ AMP 1 topics/.test(text),
      text.match(/Browse[^\n]*/)?.[0]
    );
    check("dashboard shows the free usage panel", /Your free tier usage/i.test(text));
    check("a fresh account shows 0 practice questions used", /0 \/ 20/.test(text));
    check("a fresh account shows 0 mocks used", /0 \/ 1/.test(text));

    const gauge = text.match(/(\d+) of (\d+) topics started/);
    check("dashboard progress gauge renders a caption", !!gauge, gauge?.[0]);
    if (gauge) {
      check("a fresh account has started 0 topics", gauge[1] === "0", gauge[0]);
      const realTopics = db
        .prepare(
          "SELECT COUNT(*) AS n FROM topics t JOIN exams e ON e.id = t.exam_id WHERE e.code IN ('AMP1','AMP2')"
        )
        .get().n;
      check(
        "gauge denominator counts only real AMP topics",
        Number(gauge[2]) === realTopics,
        `shown=${gauge[2]} real AMP1+AMP2 topics=${realTopics}`
      );
    }

    const nav = await page.$$eval("header a[href]", (as) => as.map((a) => a.getAttribute("href")));
    const unique = [...new Set(nav.filter((h) => h && h.startsWith("/")))];
    check("signed-in header exposes nav links", unique.length >= 3, unique.join(", "));
    const brokenNav = [];
    for (const href of unique) {
      const r = await ctx.request.get(`${BASE}${href}`, { maxRedirects: 0 });
      if (r.status() !== 200) brokenNav.push(`${href} -> ${r.status()}`);
    }
    check(`all ${unique.length} signed-in nav links return 200`, brokenNav.length === 0, brokenNav.join("; "));
  });

  // =========================================================================
  await step("topic list and topic detail", async () => {
    await page.goto(`${BASE}/topics`, { waitUntil: "domcontentloaded" });
    const links = await page.$$eval('a[href^="/topics/"]', (as) => as.map((a) => a.getAttribute("href")));
    check("topic list renders topic links", links.length >= 10, `${links.length} links`);
    const amp1Slugs = db
      .prepare(
        "SELECT t.slug FROM topics t JOIN exams e ON e.id = t.exam_id WHERE e.code = 'AMP1' ORDER BY t.order_index"
      )
      .all()
      .map((r) => r.slug);
    const listed = new Set(links.map((h) => h.replace("/topics/", "")));
    const missing = amp1Slugs.filter((s) => !listed.has(s));
    check("every AMP 1 topic in the database is listed", missing.length === 0, missing.join(", "));
    const listText = await page.locator("main").innerText();
    check("AMP 2 is shown as locked for a free account", /Locked/.test(listText));

    await page.goto(`${BASE}/topics/${topicSlug}`, { waitUntil: "domcontentloaded" });
    const text = await page.locator("main").innerText();
    const dbCount = db
      .prepare(
        "SELECT COUNT(*) AS n FROM questions q JOIN topics t ON t.id = q.topic_id WHERE t.slug = ? AND q.status = 'published'"
      )
      .get(topicSlug).n;
    check("topic detail renders a heading", (await page.locator("h1").innerText()).length > 0);
    check("topic detail shows the real published question count", text.includes(String(dbCount)), `db=${dbCount}`);
    check("topic detail shows a sample question", /Sample question/i.test(text));
    check(
      "topic detail offers a practice link",
      await page.locator(`a[href="/practice/start/${topicSlug}"]`).isVisible()
    );

    const amp2Slug = db
      .prepare("SELECT t.slug FROM topics t JOIN exams e ON e.id = t.exam_id WHERE e.code = 'AMP2' LIMIT 1")
      .get()?.slug;
    if (amp2Slug) {
      await page.goto(`${BASE}/topics/${amp2Slug}`, { waitUntil: "domcontentloaded" });
      check(
        "an AMP 2 topic is gated for a free account",
        /requires a Pro subscription/i.test(await page.locator("main").innerText())
      );
    }
  });

  // =========================================================================
  await step("learn: sidebar, lesson, checkpoint and the AMP 2 lock", async () => {
    await page.goto(`${BASE}/learn`, { waitUntil: "domcontentloaded" });
    check("learn index renders", (await page.locator("h1").innerText()).includes("Learn"));

    // The rail is built in the layout, so it must survive navigation between
    // lessons rather than being re-rendered per page.
    const rail = page.locator('nav[aria-label="Lesson topics"]');
    check("topic sidebar is present", (await rail.count()) > 0);

    const amp2Slug = db
      .prepare("SELECT t.slug FROM topics t JOIN exams e ON e.id = t.exam_id WHERE e.code = 'AMP2' LIMIT 1")
      .get()?.slug;
    if (amp2Slug) {
      // Free plan: the link points at pricing, and typing the URL is stopped too.
      await page.goto(`${BASE}/learn/${amp2Slug}`, { waitUntil: "domcontentloaded" });
      check("an AMP 2 topic redirects a free account to pricing", /\/pricing/.test(page.url()), page.url());
    }

    // Pick a topic that actually has a published lesson.
    const row = db
      .prepare(
        `SELECT t.slug AS topic, l.slug AS lesson
           FROM lessons l
           JOIN skills s ON s.id = l.skill_id
           JOIN topics t ON t.id = s.topic_id
           JOIN exams e ON e.id = t.exam_id
          WHERE e.code = 'AMP1' AND l.status = 'published'
          LIMIT 1`
      )
      .get();
    if (!row) {
      check("at least one AMP 1 lesson is published", false);
      return;
    }

    await page.goto(`${BASE}/learn/${row.topic}`, { waitUntil: "domcontentloaded" });
    check("topic page lists its lessons", (await page.locator(`a[href^="/learn/${row.topic}/"]`).count()) > 0);
    check("sidebar survives navigation into a topic", (await rail.count()) > 0);

    await page.goto(`${BASE}/learn/${row.topic}/${row.lesson}`, { waitUntil: "domcontentloaded" });
    const lessonText = await page.locator("main").innerText();
    check("lesson renders a heading", (await page.locator("h1").innerText()).length > 0);
    check("lesson has body text", lessonText.length > 400, `${lessonText.length} chars`);
    check("sidebar survives navigation into a lesson", (await rail.count()) > 0);
    check("lesson offers a way to mark it complete", (await page.getByRole("button", { name: /complete/i }).count()) > 0);

    // Any graph must be projected into pixel space. The bug this guards against
    // drew every curve into a few pixels in the corner because the renderer fed
    // data coordinates straight into the SVG path.
    const paths = await page.$$eval("svg path", (ps) => ps.map((p) => p.getAttribute("d") || ""));
    const curves = paths.filter((d) => /^M [\d.]+ [\d.]+ L/.test(d));
    if (curves.length > 0) {
      const firstX = parseFloat(curves[0].split(" ")[1]);
      check("graph paths are in pixel space, not data space", firstX > 10, `first x = ${firstX}`);
    }

    // The answer key must never ship with the page.
    const html = await page.content();
    check(
      "no answer key in the lesson HTML",
      !/explanationSteps|distractorRationales|"isCorrect":true/.test(html)
    );
  });

  // =========================================================================
  await step("practice attempt, start to finish", async () => {
    await page.goto(`${BASE}/practice/start/${topicSlug}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/practice\/runner\//, { timeout: 20000 }).catch(() => {});
    check("starting practice opens the runner", /\/practice\/runner\//.test(page.url()), page.url());
    practiceAttemptId = page.url().split("/practice/runner/")[1] ?? null;

    await page.waitForSelector("text=/Question 1 of/", { timeout: 20000 });
    const total = Number((await page.locator("main").innerText()).match(/Question 1 of (\d+)/)?.[1] ?? 0);
    check("practice runner loads a question set", total > 0, `${total} questions`);

    // All five question types have to be answerable here. Matching questions
    // render <select> per row, which an earlier version of this selector missed,
    // so the stage failed whenever a reseed happened to put one first.
    const answerable =
      'label input[type="radio"], label input[type="checkbox"], input[type="text"], select';
    const first = page.locator(answerable).first();
    await first.waitFor({ timeout: 10000 });
    const tag = await first.evaluate((el) => el.tagName.toLowerCase());
    if (tag === "select") {
      // Pick the first real choice on every row, not just this one: a matching
      // question is not submittable until each row has an answer.
      const rows = page.locator("select");
      for (let i = 0; i < (await rows.count()); i++) {
        await rows.nth(i).selectOption({ index: 1 });
      }
    } else if ((await first.getAttribute("type")) === "text") {
      await first.fill("42");
    } else {
      await first.check();
    }

    const save = page.getByRole("button", { name: /^Save answer$/ });
    check("save button enables once an answer is chosen", await save.isEnabled());
    await save.click();

    // Race the outcome against the inline error. Waiting on [role="status"]
    // instead would match the Next dev overlay, which is present from load.
    const outcome = await Promise.race([
      page.getByText(/^(Correct\.|Not correct\.)$/).first().waitFor({ timeout: 20000 }).then(() => "graded"),
      page.locator("p.text-red-600").first().waitFor({ timeout: 20000 }).then(() => "error"),
    ]).catch(() => "timeout");
    check("saving an answer returns immediate feedback", outcome === "graded", `outcome=${outcome}`);

    const cardText = await page.locator("main").innerText();
    check("feedback states the correct answer", /Answer:/.test(cardText));
    check("feedback includes a worked solution", /Worked solution:/.test(cardText));
    check("the answered question is locked after grading", await first.isDisabled());

    const saved = db
      .prepare("SELECT COUNT(*) AS n FROM attempt_answers WHERE attempt_id = ?")
      .get(practiceAttemptId).n;
    check("the answer was persisted server-side", saved === 1, `rows=${saved}`);

    // Walk to the last question and finish. The completion screen is the only
    // route from the runner to the review, so it has to be reachable.
    for (let i = 1; i < total; i++) {
      await page.getByRole("button", { name: /^(Next|Finish)$/ }).click();
      await page.waitForTimeout(60);
    }
    check(
      "can page through to the last question",
      (await page.locator("main").innerText()).includes(`Question ${total} of ${total}`)
    );

    const finish = page.getByRole("button", { name: /^(Next|Finish)$/ });
    check("the last question offers an enabled way to finish the set", await finish.isEnabled());
    await finish.click();
    await page.getByText(/Practice set complete/i).waitFor({ timeout: 10000 }).catch(() => {});
    check(
      "finishing shows the completion screen",
      /Practice set complete/i.test(await page.locator("main").innerText())
    );
    const reviewLink = page.getByRole("link", { name: /Review your answers/i });
    check("completion screen links to the review", await reviewLink.isVisible());
    await reviewLink.click();
    await page.waitForURL(/\/attempt\/.*\/review/, { timeout: 20000 }).catch(() => {});
    check("completion link reaches the review page", /\/attempt\/.*\/review/.test(page.url()), page.url());
    check(
      "practice review shows the question that was answered",
      /Question 1/.test(await page.locator("body").innerText())
    );
  });

  // =========================================================================
  await step("mock exam: timer, answering, submitting", async () => {
    await page.goto(`${BASE}/mock`, { waitUntil: "domcontentloaded" });
    const listText = await page.locator("main").innerText();
    check("mock list renders", /Timed mock exams/i.test(listText));
    check("free account sees its weekly allowance", /1 mock per week/i.test(listText));
    const startLinks = await page.$$eval('a[href^="/mock/start/"]', (as) => as.length);
    check("mock list offers a startable paper", startLinks > 0, `${startLinks} start links`);

    await page.locator('a[href^="/mock/start/"]').first().click();
    await page.waitForURL(/\/mock\/runner\//, { timeout: 60000 }).catch(() => {});
    check("starting a mock opens the runner", /\/mock\/runner\//.test(page.url()), page.url());
    mockAttemptId = page.url().split("/mock/runner/")[1] ?? null;

    await page.waitForSelector("text=/Time Left:/", { timeout: 30000 });
    // The exam chrome renders inside the signed-in layout, so there are two
    // <header> elements on this page; the timer lives in the inner one.
    const examHeader = page.locator("header").filter({ hasText: /Time Left:/ });
    check("mock exam chrome is distinct from the site header", (await page.locator("header").count()) === 2);
    const readTimer = async () => {
      const m = (await examHeader.innerText()).match(/Time Left:\s*(\d+):(\d{2}):(\d{2})/);
      return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
    };
    const first = await readTimer();
    check("countdown timer is present", first !== null, `seconds=${first}`);

    // The runner polls the server for the remaining time every 5 seconds, so a
    // shorter wait than that can legitimately observe no change.
    await page.waitForTimeout(7000);
    const second = await readTimer();
    check("countdown timer decrements", first !== null && second !== null && second < first, `${first} -> ${second}`);

    const limit = db
      .prepare("SELECT time_limit_seconds FROM attempts WHERE id = ?")
      .get(mockAttemptId)?.time_limit_seconds;
    check("attempt carries a server-side time limit", !!limit, `limit=${limit}`);
    check(
      "displayed time is consistent with the server limit",
      first !== null && first <= limit && first > limit - 300,
      `shown=${first} limit=${limit}`
    );

    const pageCount = Number((await page.locator("body").innerText()).match(/Page 1 of (\d+)/)?.[1] ?? 0);
    const expected = db
      .prepare("SELECT COUNT(*) AS n FROM attempt_questions WHERE attempt_id = ?")
      .get(mockAttemptId).n;
    check("mock loads a full paper", pageCount > 1 && pageCount === expected, `pages=${pageCount} fixed=${expected}`);

    const input = page.locator('label input[type="radio"], label input[type="checkbox"], input[type="text"]').first();
    await input.waitFor({ timeout: 20000 });
    if ((await input.getAttribute("type")) === "text") await input.fill("7");
    else await input.check();

    await page
      .waitForFunction(() => /\b[1-9]\d* of \d+ questions saved/.test(document.body.innerText), undefined, {
        timeout: 20000,
      })
      .catch(() => {});
    const savedText = (await page.locator("body").innerText()).match(/(\d+) of (\d+) questions saved/);
    check("answering autosaves with no save button to press", savedText?.[1] === "1", savedText?.[0]);

    const rows = db
      .prepare("SELECT COUNT(*) AS n FROM attempt_answers WHERE attempt_id = ?")
      .get(mockAttemptId).n;
    check("mock answer was persisted server-side", rows === 1, `rows=${rows}`);

    const html = await page.content();
    check(
      "the mock runner does not ship worked solutions to the client",
      !/explanationSteps|conceptSummary/.test(html)
    );

    await page.getByRole("button", { name: /^Submit Quiz$/ }).click();
    const confirm = page.getByRole("button", { name: /Confirm Submit/i });
    check("submitting asks for confirmation first", await confirm.isVisible());
    await confirm.click();
    await page.waitForURL(/\/attempt\/.*\/review/, { timeout: 40000 }).catch(() => {});
    check("submitting a mock lands on the review page", /\/attempt\/.*\/review/.test(page.url()), page.url());
  });

  // =========================================================================
  await step("attempt review after submission", async () => {
    await page.goto(`${BASE}/attempt/${mockAttemptId}/review`, { waitUntil: "domcontentloaded" });
    const text = await page.locator("body").innerText();
    const row = db.prepare("SELECT score, submitted_at FROM attempts WHERE id = ?").get(mockAttemptId);
    check("attempt is recorded as submitted", !!row?.submitted_at, JSON.stringify(row));
    check("review page shows results", /Exam results/i.test(text));
    check("review page shows the score held in the database", text.includes(`${row.score}%`), `score=${row.score}`);
    check("review page shows the topic breakdown", /Topic breakdown/i.test(text));
    check("review page shows a question-by-question review", /Question review/i.test(text));
    check("review page marks the correct answer", /Correct answer/i.test(text));
    check("review page shows the worked solution after submission", /Worked solution:/i.test(text));

    const other = db.prepare("SELECT id FROM attempts WHERE user_id != ? LIMIT 1").get(userId)?.id;
    if (other) {
      await page.goto(`${BASE}/attempt/${other}/review`, { waitUntil: "domcontentloaded" });
      check("another user's attempt review is not accessible", !page.url().includes(other), page.url());
    } else {
      console.log("SKIP  no other user's attempt in the database to test against");
    }
  });

  // =========================================================================
  await step("error boundary", async () => {
    await page.goto(`${BASE}/attempt/does-not-exist-${stamp}/review`, { waitUntil: "domcontentloaded" });
    // The boundary is a client component, so it appears after hydration rather
    // than in the first paint.
    await page
      .getByRole("heading", { name: /Something went wrong|does not exist/i })
      .waitFor({ timeout: 20000 })
      .catch(() => {});
    const text = await page.locator("body").innerText();
    check(
      "an unresolvable attempt id is caught and explained, not left blank",
      /Something went wrong/i.test(text) || /does not exist/i.test(text),
      text.slice(0, 120).replace(/\s+/g, " ")
    );
    check(
      "the error page offers a way back",
      (await page.locator('a[href="/dashboard"], a[href="/"]').count()) > 0
    );
  });

  // =========================================================================
  await step("account page, plan state and checkout", async () => {
    await page.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
    const text = await page.locator("main").innerText();
    check("account page renders", /Account/i.test(await page.locator("h1").innerText()));
    check("account page shows the signed-in email", text.includes(email));
    check("account page shows the name", text.includes(fullName));
    check("free plan is shown as FREE", /\bFREE\b/.test(text), text.match(/\b(FREE|PRO)\b/)?.[0]);
    check("free plan offers an upgrade", await page.getByRole("button", { name: /Upgrade to Pro/i }).isVisible());
    check("account page offers a password change", await page.locator('input[name="currentPassword"]').isVisible());
    check(
      "account page offers account deletion",
      await page.getByRole("button", { name: /delete my account/i }).isVisible()
    );

    // Checkout, up to but not through the provider redirect.
    //
    // Both outcomes are correct depending on configuration, so ask the API
    // which one applies rather than hardcoding either. This assertion used to
    // assume no provider was configured; it then failed the moment a provider was
    // wired up, reporting a working checkout as a defect.
    const probe = await ctx.request.post(`${BASE}/api/checkout`);
    const probeBody = await probe.json();
    const checkoutConfigured = probe.status() === 200;

    if (checkoutConfigured) {
      check(
        "configured checkout returns a provider URL, not an error",
        typeof probeBody.url === "string" && /^https:\/\//.test(probeBody.url),
        JSON.stringify(probeBody).slice(0, 120)
      );
      check(
        "checkout URL points at the payment provider, not at this site",
        !new URL(probeBody.url).host.includes(new URL(BASE).hostname),
        probeBody.url
      );
      check(
        "checkout session is created server-side, so no secret key reaches the browser",
        !/sk_(test|live)_/.test(await page.content())
      );
    } else {
      check("POST /api/checkout fails gracefully (503, not 500)", probe.status() === 503, `status=${probe.status()}`);
      check(
        "checkout error body carries a message, not a stack trace",
        typeof probeBody.error === "string" && !/\bat \w+ \(/.test(probeBody.error),
        JSON.stringify(probeBody)
      );

      // Only meaningful when there is no provider: with one configured the
      // click navigates away to the provider instead of surfacing an alert.
      const before = page.url();
      await page.getByRole("button", { name: /Upgrade to Pro/i }).click();
      // Scoped to the paragraph the button renders. A bare [role="alert"] also
      // matches an empty div the Next dev overlay leaves in the page.
      const alert = page.locator('p[role="alert"]').first();
      await alert.waitFor({ timeout: 15000 }).catch(() => {});
      check("unconfigured checkout shows an error rather than hanging", await alert.isVisible());
      const alertText = (await alert.textContent()) ?? "";
      check("unconfigured checkout explains itself in plain language", /not available|try again/i.test(alertText), alertText);
      check("unconfigured checkout does not navigate away", page.url() === before, page.url());
      check(
        "the upgrade button recovers rather than staying stuck",
        await page.getByRole("button", { name: /Upgrade to Pro/i }).isEnabled()
      );
    }

    const ent = await ctx.request.get(`${BASE}/api/entitlements`);
    check("GET /api/entitlements works for a signed-in user", ent.status() === 200, `status=${ent.status()}`);
    const entBody = await ent.json();
    check("entitlements report the free plan", entBody.plan === "free" && entBody.isPro === false, JSON.stringify(entBody));

    // Pro plan state, driven from the database because there is no way to buy
    // one here. Reverted immediately afterwards.
    db.prepare("UPDATE users SET plan = 'pro' WHERE id = ?").run(userId);
    await page.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
    const proText = await page.locator("main").innerText();
    check("pro plan is shown as PRO", /\bPRO\b/.test(proText), proText.match(/\b(FREE|PRO)\b/)?.[0]);
    check(
      "pro plan does not offer an upgrade button",
      (await page.getByRole("button", { name: /Upgrade to Pro/i }).count()) === 0
    );
    check("pro plan offers cancellation", /Cancel subscription/i.test(proText));
    await page.goto(`${BASE}/topics`, { waitUntil: "domcontentloaded" });
    check("a pro account no longer sees AMP 2 as locked", !/Locked/.test(await page.locator("main").innerText()));

    db.prepare("UPDATE users SET plan = 'free' WHERE id = ?").run(userId);
    await page.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
    check("reverting the plan is reflected immediately", /\bFREE\b/.test(await page.locator("main").innerText()));
  });

  // =========================================================================
  await step("sign out, then sign back in", async () => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Sign out$/ }).first().click();
    await page.waitForURL((u) => !u.pathname.startsWith("/dashboard"), { timeout: 20000 }).catch(() => {});
    check("sign out leaves the app", !page.url().includes("/dashboard"), page.url());

    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    check("session is cleared after sign out", page.url().includes("/signin"), page.url());

    // A rejected password must say so, and say so in a way a screen reader
    // announces, rather than silently leaving the form as it was.
    await page.goto(`${BASE}/signin`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "not the right password");
    await page.click('button[type="submit"]');
    const authError = page.locator('form [role="alert"]').first();
    await authError.waitFor({ timeout: 20000 }).catch(() => {});
    check("a wrong password is rejected", !page.url().includes("/dashboard"), page.url());
    check("the sign-in failure is surfaced as an announced alert", await authError.isVisible());

    await page.goto(`${BASE}/signin`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});
    check("sign in with the same credentials works", page.url().includes("/dashboard"), page.url());

    const text = await page.locator("main").innerText();
    // The dashboard no longer lists recent attempts; it leads with the learning
    // path and summarises progress instead.
    check("dashboard leads with the learning path", /Continue learning|Learn the topics/.test(text));
    check("dashboard reports lesson progress", /\d+ of \d+ lessons read/.test(text));
    check("the gauge now reports started topics", !/^0 of/.test(text.match(/\d+ of \d+ topics started/)?.[0] ?? "0 of"), text.match(/\d+ of \d+ topics started/)?.[0]);
  });

  check("no uncaught page errors during the signed-in flows", pageErrors.length === 0, pageErrors.join("; "));
} finally {
  // Cleanup in the same order lib/account.ts uses, so no rows are orphaned.
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
