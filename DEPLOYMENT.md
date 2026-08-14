# Deploying AMP Prep

This guide takes AMP Prep from the local development build to a live site, on a
host with a **persistent disk** — Fly.io, Railway, or an ordinary VPS.

Read the whole guide once before you start, and read the two warnings in
"Seeding the database" before you run anything. The steps are ordered so each
one builds on the last.

## Architecture at a glance

```
Applicant browser
      |
      v  HTTPS (TLS terminated by the host's edge)
Single Node process: `next start`
      |                                   |
      v                                   v
/data/amp-prep.db  (mounted volume)   payment provider (none connected)
  + -wal + -shm                       (hosted checkout, signed webhook)
  better-sqlite3, WAL mode                  optional; unset = free for all
```

- One Node 20 process runs the Next.js server and every route.
- **SQLite** (`better-sqlite3`, `lib/db/sqlite.ts`) stores every row: users,
  the question bank, papers, attempts, answers, and the sign-in rate-limit
  counters. There is no external database and no external cache.
- Sessions are a bcrypt password hash plus a signed JWT in an httpOnly cookie
  (`lib/auth.ts`). There is no third-party auth provider.
- **No payment provider is connected.** Lemon Squeezy and Tap are implemented
  behind one interface in `lib/payments/index.ts`, but neither is configured and
  neither has been run against a live account. Checkout answers 503 and the site
  is free for everyone; see "Launching without payments".

## Why not Vercel

The database is a file that the server process opens directly. Serverless
platforms including Vercel give each invocation an ephemeral filesystem, so
`data/amp-prep.db` would be recreated empty on a cold start and every signup,
attempt, and answer written to it would be silently discarded — no error, no
log line, just data that is gone by the next request. The host must give the
process a **disk that survives restarts** and must run **exactly one** instance
of it.

`supabase/migrations/` is retained because Postgres is the eventual scale-out
path, but no application code reads it today. See "Postgres, later" at the end.

## Four constraints that decide the host

These are properties of this codebase, not preferences. A host that cannot
satisfy all four will not work.

1. **A persistent volume, on local storage.** `lib/db/sqlite.ts:13` resolves
   `DB_PATH` to `path.resolve(process.cwd(), "data/amp-prep.db")`. That path
   must live on a disk that survives deploys and restarts. It must be real
   block storage — NFS and other network filesystems break SQLite's locking and
   will corrupt the database.

2. **Exactly one instance.** `better-sqlite3` opens a local file. Two machines
   mean two separate, diverging databases, and users hit whichever one the load
   balancer picks. WAL mode buys you concurrent readers alongside one writer
   *within a single filesystem* — it does nothing across machines. Independently
   of that, `lib/rate-limit.ts` keeps its sign-in throttle counters in the same
   SQLite file, so N instances multiply the effective limit by N. Set the
   replica count to 1 and leave it there.

3. **Node 20 or newer, the same major at build and run time.** `.nvmrc` pins
   `20`; `package.json` requires `>=20.0.0`. `better-sqlite3` is a native
   addon compiled against a specific Node ABI — building on one major and
   running on another fails at import with a module-version error. Pin one base
   image for both stages.

4. **Dev dependencies present at runtime.** `npm run seed`, `npm run assemble`,
   and `npm run grant-pro` all execute through `tsx`, which is a
   **devDependency**. An image built with `npm ci --omit=dev`, or one that
   prunes after building, cannot seed the database or grant Pro to anyone. Keep
   the full `node_modules` in the runtime image.

Note also that `next.config.mjs` does not set `output: "standalone"`, so there
is no self-contained server bundle to copy — the runtime image needs
`node_modules` anyway, which lines up with constraint 4.

## Prerequisites

- This repository pushed to GitHub (or reachable by the host).
- An account on Fly.io, Railway, or a VPS you can SSH into.
- Node.js 20+ locally.
- A payment provider account, **only** if you want paid plans on day one. None is set up; see Step 6.

---

## Step 1: Provision the host and mount the volume

The instructions below use Fly.io because its volumes are explicit and its free
allowance covers this workload. Railway and a plain VPS are noted after.

The container image is minimal by necessity — one stage, no pruning:

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci                 # full install: next build and tsx both need devDeps
COPY . .

# APP_URL must be set for the BUILD, not just at runtime. See "Two things that
# are baked in at build time" below.
ARG APP_URL
ENV APP_URL=${APP_URL}

# Seed a build-local database before building: the marketing homepage is
# statically prerendered and reads the question bank during `next build`.
# This database is thrown away when the volume mounts over data/ at runtime.
RUN npm run seed && npm run assemble

RUN npm run build

# Stash the question bank outside data/, because the volume mounts over data/
# and would otherwise hide it. Step 3 copies it back onto the volume.
RUN mkdir -p /app/seed-data \
 && cp data/generated/questions.json data/generated/topics.json /app/seed-data/
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
```

Build it with the URL supplied:
`fly deploy --build-arg APP_URL=https://your-domain`.

`python3/make/g++` are there because `better-sqlite3` may compile from source if
no prebuilt binary matches the platform. `WORKDIR /app` is load-bearing: see the
`process.cwd()` warning below.

### A `.dockerignore` is not optional

`COPY . .` does **not** honour `.gitignore`. Without a `.dockerignore`, Docker
copies your workstation's `node_modules/` — including the `better-sqlite3`
native binding compiled for macOS — straight over the correct Linux binding that
`npm ci` just produced, and the app dies at `require("better-sqlite3")` with a
module-version error. It would also ship your dev database and the untracked
source PDF into the image. Create `.dockerignore` alongside the Dockerfile:

```
node_modules
.next
data/amp-prep.db*
data/source
.env
.env.local
.git
```

> The Dockerfile and `.dockerignore` above were not built in the environment
> where this guide was written — no image build was run here. Treat the first
> `fly deploy` as the real test of them. In particular, watch the build log for
> the `[seed]` output; if it is missing, the homepage will ship empty.

Write both files **before** you run `fly launch`. With no Dockerfile present,
`fly launch` scaffolds its own Next.js one — typically multi-stage with a
dev-dependency prune, which violates constraint 4 (no `tsx`, so you cannot seed
or grant Pro) and skips the build-time seed. When a Dockerfile already exists,
Fly detects and keeps it.

```bash
fly launch --no-deploy          # writes fly.toml; decline any managed database
fly volumes create amp_data --size 1 --region <your-region>
```

In `fly.toml`, mount the volume and hold the instance count at one:

```toml
[mounts]
  source      = "amp_data"
  destination = "/app/data"

[http_service]
  internal_port        = 3000
  force_https          = true
  auto_stop_machines   = false
  min_machines_running = 1
```

### Two ways this goes wrong, both silent

**The volume masks whatever the image put there.** Mounting `amp_data` at
`/app/data` hides the image's own `/app/data` directory completely. If you build
the database during the image build, it disappears the moment the volume mounts,
and you will see an empty site with no error anywhere. Build the database *on
the volume, after mounting* — that is what Step 3 does. Note that
`data/generated/*.json` also lives under `data/`, so once the volume is mounted
those files are hidden too; Step 3 handles this by seeding from a copy outside
the mount.

**The working directory decides which database you get.** `DB_PATH` is relative
to `process.cwd()`, and `lib/db/sqlite.ts:19` calls
`fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })` before opening. Start
the process from the wrong directory and nothing errors — SQLite happily creates
a brand-new empty database at `<wrong-cwd>/data/amp-prep.db`, the site comes up
with zero questions and zero users, and your real data sits untouched on the
volume. Always start from the repository root (`WORKDIR /app` above; a
`WorkingDirectory=` line in a systemd unit on a VPS).

Alternatively, set **`AMP_DB_PATH`** to an absolute path and the working
directory stops mattering. On a host where the volume is mounted at `/data`
rather than inside the app directory, `AMP_DB_PATH=/data/amp-prep.db` is the
clearer arrangement — it also keeps `data/generated/*.json` visible, because
nothing is mounted over `data/` any more, which removes the need for the seed
stash in the Dockerfile.

### Two things that are baked in at build time

Nothing in `app/` sets `export const dynamic = "force-dynamic"` or `revalidate`,
and the homepage's server component tree — `app/page.tsx`, `SiteHeader`,
`SiteFooter` — calls no dynamic API: no `cookies()`, no `headers()`, no
`getCurrentUser()`. (`MarketingNav`, `SampleQuestions`, `Katex`, and
`AccountDeletedNotice` are all `"use client"`, which does not make the server
render dynamic.) So the public pages are statically prerendered during
`npm run build` and their HTML is frozen into the image. Two consequences, both
of which look like runtime configuration problems and are not:

**`APP_URL` is a build-time variable.** `app/sitemap.ts` and `app/robots.ts` are
plain functions over `SITE_URL` with no dynamic APIs, and `app/layout.tsx:12`
computes `metadataBase: new URL(siteUrl)`. All three are evaluated during the
build. Setting `APP_URL` as a runtime secret afterwards and restarting the
process **will not change them** — the localhost URLs are already in the output.
It must be present in the environment that runs `next build`, which is why the
Dockerfile takes it as an `ARG`. Whenever the public origin changes, you must
**rebuild**, not merely restart.

> Verified, not inferred. A build with `APP_URL` unset produced
> `.next/server/app/sitemap.xml.body` containing `<loc>http://localhost:3000</loc>`
> and a `robots.txt` ending `Sitemap: http://localhost:3000/sitemap.xml`.
> Rebuilding with `APP_URL=https://ampprep.example` changed both, along with the
> canonical link and the JSON-LD `@id` values in the prerendered homepage. The
> build output also lists `/sitemap.xml` and `/robots.txt` as `○ (Static)`.
>
> To repeat it: `NEXT_DIST_DIR=.next-verify npx next build`, then read
> `.next-verify/server/app/sitemap.xml.body`. `NEXT_DIST_DIR` (see
> `next.config.mjs`) keeps the verification build out of `.next/`, so it can run
> without disturbing a dev server.

**The homepage reads the database at build time.** `app/page.tsx:79` is a
synchronous server component calling `getQuestionCount()` and
`getTopicQuestionStats()`, with a comment stating the samples are picked at
build time deliberately so the page stays static. If no seeded database exists
during the build, `lib/db/sqlite.ts:19` quietly creates an empty one, the counts
render as zero and the sample questions vanish — and because the volume mounts
over `data/` afterwards, no amount of seeding at runtime will fix the shipped
HTML. That is why the Dockerfile seeds before it builds. The build-time
database exists only to render the marketing page and is discarded; the real one
is created in Step 3.

A corollary: the question counts on the homepage reflect the build, not the live
database. They only change when you rebuild.

### WAL companion files

`lib/db/sqlite.ts:21` sets `journal_mode = WAL`. SQLite therefore maintains two
files next to the database:

```
/app/data/amp-prep.db
/app/data/amp-prep.db-wal    recent committed transactions, not yet checkpointed
/app/data/amp-prep.db-shm    shared-memory index for the WAL
```

All three **must be on the same volume** — they are, automatically, as long as
you mount the directory rather than trying to bind-mount the single `.db` file.
Never mount just `amp-prep.db`. Committed data can live in `-wal` for a while
before it is folded into the main file, which is exactly why copying the `.db`
on its own is not a backup (see "Backups").

### Railway

Add a volume with mount path `/app/data`, set **replicas to 1**, and set the
same environment variables. The rest of this guide applies unchanged.

### A plain VPS

Clone the repo to `/srv/amp-prep`, `npm ci`, export `APP_URL`, `npm run build`,
and run `npm start` under a systemd unit with
`WorkingDirectory=/srv/amp-prep`. Put Caddy or nginx in front for TLS. `data/`
is then just a directory on the server disk — which satisfies the persistence
requirement, provided that disk is included in your snapshots.

There is no volume boundary here, so the build and the live database share one
directory. Read the VPS warning in Step 3 before you script any of this.

---

## Step 2: Set the environment variables

Copy `.env.example` for the full annotated list. On the host, set these as
secrets in the platform (`fly secrets set NAME=value`), not as a file on the
volume.

Two are **required**. Both fail in ways that are easy to miss:

| Variable | Required | What happens if it is wrong |
| --- | --- | --- |
| `JWT_SECRET` | **Yes** | `lib/auth.ts:23-34` throws when `NODE_ENV=production` and this is unset *or* still equals the dev default `local-dev-secret-change-in-production`. The app serves nothing. This is the loud failure of the two. |
| `APP_URL` | **Yes — at build time** | Silent. `lib/site.ts:14` falls back to `http://localhost:3000`, and that value propagates to `metadataBase`, `og:url`, the canonical `<link>`, every URL in `sitemap.xml`, and the sitemap pointer inside `robots.txt`. Share previews break, and you hand search engines a sitemap full of URLs that do not exist. Set it to the live origin, scheme included, no trailing slash — **and pass it to the build**, not only to the running process. |
| `PAYMENT_PROVIDER` | No | `lemonsqueezy` or `tap`. Unset (the current state) leaves checkout disabled and the site free for everyone. Any unrecognised value also disables checkout. |
| `LEMONSQUEEZY_API_KEY` | No | The on/off switch for Lemon Squeezy. Absent → checkout returns 503. |
| `LEMONSQUEEZY_STORE_ID` | With the above | Checkout requests fail at the provider. |
| `LEMONSQUEEZY_PRO_VARIANT_ID` | With the above | Checkout requests fail at the provider. |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | With the above | Webhooks fail signature verification, so paid subscriptions never activate. |
| `TAP_SECRET_KEY` / `TAP_WEBHOOK_SECRET` | No | Same roles, for `PAYMENT_PROVIDER=tap`. |
| `SMTP_URL` | No, but password reset needs it | Without it `/forgot-password` shows no form and tells the user to email the contact address instead. Reset emails are printed to the server log rather than sent. |
| `MAIL_FROM` | No | Envelope sender; defaults to the contact address in `lib/legal.ts`. |

Generate the secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

```bash
fly secrets set JWT_SECRET='<the value above>'
fly deploy --build-arg APP_URL='https://your-domain'
```

Note the asymmetry, which is easy to get wrong. `JWT_SECRET` is read at request
time, so a secret plus a restart is enough. `APP_URL` is consumed during
`next build` and frozen into the prerendered HTML, `sitemap.xml`, and
`robots.txt`, so it must be a **build argument**. Setting it only as a runtime
secret leaves a live site advertising `localhost`. Every change of public origin
— including moving off `*.fly.dev` onto a custom domain — requires a rebuild.

If you are deploying somewhere without build arguments (Railway, or a VPS where
you run `npm run build` yourself), just make sure `APP_URL` is exported in the
shell or the service environment *before* the build command runs.

Two variables that appeared in earlier revisions of this guide —
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and `APP_NAME`) — are
not read anywhere in the codebase. Do not set them.

---

## Step 3: Seed the database

The question bank ships in the repository: `data/generated/questions.json` and
`data/generated/topics.json` are both tracked in git (verify with
`git ls-files data/generated/`). The SQLite database is **not** — `.gitignore`
excludes `*.db`, `*.db-wal`, and `*.db-shm`. So the host builds the database
from the JSON, once, after the volume is mounted.

> ### Run this once, at first provision. Never on redeploy.
>
> `npm run seed` is destructive by design. `scripts/seed.ts:91-98` deletes, in
> order: `paper_questions`, **`attempt_answers`**, **`attempt_questions`**,
> `question_options`, `question_matches`, `question_match_choices`,
> `numeric_answers`, and `questions`.
>
> `users` and `attempts` are *not* deleted. That combination is the trap: a
> re-seed on a live database keeps every user and every attempt row while
> destroying the questions and answers those attempts pointed at. You are left
> with dashboards listing past attempts that contain nothing and cannot be
> reopened. It is worse than a clean wipe, because it looks like the site still
> works.
>
> Do not put `npm run seed` in a release command, a `[deploy]` block, or a
> container entrypoint. Run it by hand.
>
> **The build-time seed in the Dockerfile is a different database.** It runs
> inside the image, against a throwaway file that the volume mount later hides,
> purely so the static homepage prerenders with real content. It never touches
> the volume, so it is safe on every rebuild.
>
> **On a VPS this separation does not exist and the footgun is live.** There,
> `npm run build` runs in the same directory as your production
> `data/amp-prep.db`, so a build-time seed would delete the real questions and
> answers. On a VPS: take a backup, then build and seed in a *separate* checkout
> from the one you serve, or accept the loss knowingly. Do not copy the
> Dockerfile's `RUN npm run seed && npm run assemble` line into a VPS deploy
> script without thinking about which database it will hit.

### These are two commands, and the order is a trap

This is not a style preference about running things in sequence. It is a genuine
footgun in the repository, and it is worth understanding before you run either
command:

- `scripts/seed.ts:91` runs `DELETE FROM paper_questions` and **never
  repopulates it**.
- `scripts/assemble-papers.ts:30-37` is the **only** code that writes
  `paper_questions`.
- `seed` deletes the `papers`' contents but leaves the 69 `papers` rows
  themselves alone.

So the first command silently destroys the second command's output, and the
second command is the only thing that can restore it. **`npm run seed` on its
own leaves you with a site that has no working mock exams at all** — and the
mock exam is a headline feature of this product.

The failure is silent in the worst way. `lib/db/queries.ts:218-227` now filters
papers to those that actually have questions attached (`AND EXISTS (SELECT 1
FROM paper_questions ...)`), which is the right behaviour — but it means a host
that ran `seed` without `assemble` serves `/mock` as an **empty list**, HTTP
200, no error anywhere. It reads as "no mock exams have been published yet"
rather than as a broken deployment. Nothing in the logs will tell you.

Always run the pair:

```bash
fly ssh console
cd /app

# The volume is mounted over data/, which hides the image's copy of the
# question bank. Put it back on the volume first, from the stash the
# Dockerfile created in Step 1.
mkdir -p data/generated
cp /app/seed-data/questions.json /app/seed-data/topics.json data/generated/

npm run seed        # builds questions, options, matches, numeric answers
npm run assemble    # builds the mock exam papers from those questions
```

If your image does not carry the `/app/seed-data` stash, upload the two files
by hand instead (`fly ssh sftp shell`, then `put` each into
`/app/data/generated/`). They are the only content the seed needs.

Expected output includes a line reading `[seed] Verified file not found, using
raw questions.json`. **That is normal**, not an error: `scripts/seed.ts:16-17`
prefers `data/generated/questions-verified.json`, which is a local pipeline
artifact and is not tracked in git. The fallback to `questions.json` is the
intended production path.

Confirm the result before moving on:

```bash
node -e 'const d=require("better-sqlite3")("data/amp-prep.db",{readonly:true});
const q=(s)=>d.prepare("select count(*) c from "+s).get().c;
console.log("published:",q("questions where status=\x27published\x27"),
 "free:",q("questions where status=\x27published\x27 and is_free=1"),
 "topics:",q("topics"),"papers:",q("papers"),"paper_questions:",q("paper_questions"));'
```

**`paper_questions` must be greater than zero**, and `papers` should read 69
(50 AMP1, 19 AMP2). If `paper_questions` is zero while `papers` is not,
`assemble` did not run. Do not move on: `/mock` will render an empty list and
look merely unpopulated. Run `npm run assemble` and check again.

This count is the only cheap signal you get. `lib/attempts.ts:108-110` does
raise `"No questions available for this selection."` if an attempt is ever
started against an empty paper, and `app/(app)/mock/start/[examCode]/page.tsx:56-58`
catches it and redirects to `/mock?reason=no-questions` — so the code is not
silently broken. But with the `getPapers` filter in place, an applicant never
reaches that path in the first place; they just see nothing to click. The error
handling is real and will not help you notice.

### When the question bank changes

Regenerate the JSON on your workstation, commit it, deploy, then — accepting the
loss described above — re-seed **and re-assemble**:

```bash
npm run seed && npm run assemble    # never one without the other
```

`assemble` is not a first-provision-only step. Every re-seed clears
`paper_questions` again, so every re-seed must be followed by an assemble or the
mock exams disappear from the site. If you remember one thing from this section:
**these two commands are a single operation that happens to have been split in
two.** Treat running `seed` alone as an incident.

There is no incremental content update path in this codebase today. In practice
this means **take a backup first**, and prefer doing content updates before you
have real users rather than after.

---

## Step 4: TLS and the domain

The app already sends HSTS: `next.config.mjs:28-31` sets
`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
alongside CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
and `Permissions-Policy`. Browsers ignore HSTS delivered over plain HTTP, so it
does nothing until TLS is in front of the app.

- **Fly.io**: TLS terminates at the edge automatically for `*.fly.dev`. Keep
  `force_https = true` in `fly.toml`. For a custom domain,
  `fly certs add your-domain` and add the DNS records it prints — Fly issues and
  renews a Let's Encrypt certificate.
- **Railway**: TLS on the generated subdomain and on custom domains is managed
  for you.
- **VPS**: use Caddy, which obtains and renews certificates automatically. A
  three-line Caddyfile reverse-proxying to `localhost:3000` is enough.

Custom domain, on any of them:

1. Buy the domain from any registrar.
2. Add the domain in the host's dashboard (or `fly certs add`), which prints the
   DNS records to create — usually an A/AAAA or CNAME plus a verification
   record.
3. Create those records at your registrar. Propagation takes minutes to hours.
4. Update `APP_URL` to the new origin and redeploy. Update the payment
   provider's webhook URL to match.

One caution on the `preload` directive: it is only a request. You are not in the
browser preload list until you submit the domain at hstspreload.org. Do not
submit unless you are committed to HTTPS on the apex **and every subdomain** for
the full two years, because removal from the list is slow and there is no quick
undo.

---

## Step 5: Backups

A single-file database on a single volume with no backup is the largest
operational risk in this deployment. One `fly volumes destroy`, one corrupted
filesystem, and the entire product — question bank, users, and every attempt —
is gone.

**Recommendation: a cron'd `VACUUM INTO` snapshot copied off the volume.** Use
litestream later if you need near-zero data loss.

The reasoning is short. Litestream gives continuous replication with an RPO of
seconds, but it expects to own WAL checkpointing, and a misconfiguration leaves
it running while quietly replicating nothing — a backup you believe in but do
not have. A snapshot you can list, download, and open is verifiable by
inspection. Start there; add litestream when the value of the last hour of
attempts justifies the extra moving part.

### Taking a backup

Do **not** use `cp data/amp-prep.db backup.db`. In WAL mode, committed
transactions live in `-wal` until a checkpoint folds them in, so a plain copy of
the `.db` alone is stale at best and internally inconsistent at worst. Both
commands below use SQLite's online-backup machinery instead and are safe to run
against a database the live site is actively writing to.

`VACUUM INTO` is the simpler of the two — it needs only a read-only handle and
produces a compacted single file with no `-wal` companion:

```bash
fly ssh console
cd /app
node -e 'const out="/tmp/amp-"+new Date().toISOString().slice(0,10)+".db";
require("better-sqlite3")("data/amp-prep.db",{readonly:true}).exec("VACUUM INTO \x27"+out+"\x27");
console.log("wrote",out);'
```

(The date is built in JavaScript rather than with `$(date)` so the single-quoted
`node -e` argument survives shell quoting unchanged.)

The equivalent through better-sqlite3's own backup API, which streams in pages
and reports progress:

```bash
node -e "const d=require('better-sqlite3')('data/amp-prep.db'); \
  d.backup('/tmp/amp-'+new Date().toISOString().slice(0,10)+'.db') \
   .then(r=>{console.log(r);d.close()})"
```

Both were run against this project's live WAL database while the dev server held
it open; both produced a file that passes `PRAGMA integrity_check` with the full
question count intact. Neither needs the `sqlite3` CLI, which a slim Node image
does not ship — they use the `better-sqlite3` already in `node_modules`.

### Getting it off the volume

A backup sitting on the same volume as the original is not a backup. Pull it
down, or push it to object storage:

```bash
# from your workstation
fly ssh sftp get /tmp/amp-2026-08-14.db ./backups/amp-2026-08-14.db
```

Automate it as a daily job on a machine you control (your workstation's cron,
or a small GitHub Actions workflow holding a Fly deploy token): `ssh console` →
`VACUUM INTO` → `sftp get` → keep 30 days. Deliberately not a cron *inside* the
container: the container is the thing that might be gone.

### Restoring

You do not need to stop the app first, and you should not try: killing the
server on Fly takes the machine's PID 1 with it and ends your SSH session
mid-restore. Swap the file underneath the running process instead. `dbInstance`
in `lib/db/sqlite.ts:15` is a module-level singleton, so the process keeps
writing to the *old* file handle and never notices the replacement until it
restarts — which makes the swap itself safe, and the restart the moment the new
database takes effect.

```bash
fly ssh sftp shell            # put ./backups/amp-2026-08-14.db /tmp/restore.db
fly ssh console
cd /app
mv data/amp-prep.db data/amp-prep.db.broken
rm -f data/amp-prep.db-wal data/amp-prep.db-shm    # stale companions of the old file
cp /tmp/restore.db data/amp-prep.db
exit
```

```bash
fly machine restart <machine-id>    # the restored file is picked up here
```

Restart promptly: anything users write between the swap and the restart goes to
the orphaned handle and is lost with it.

Removing the old `-wal` and `-shm` matters: left behind, they belong to a
different database file and SQLite may refuse to open or may misread the
restored one.

**Verify a backup before you rely on it.** Once, on purpose, open a downloaded
snapshot locally and check it:

```bash
node -e "const d=require('better-sqlite3')('./backups/amp-2026-08-14.db',{readonly:true});
console.log(d.pragma('integrity_check'), d.prepare('select count(*) c from users').get(),
            d.prepare('select count(*) c from questions').get())"
```

An untested backup is a hypothesis.

---

## Step 6: Payments (optional)

**No payment provider is connected, and none is required.** The site runs free
for everyone as it stands: `getPaymentProvider()` returns null, `/api/checkout`
answers `503 {"error":"Checkout is not available yet. Please try again later."}`,
and Pro is never granted except by the admin tool below. That is a supported
state, not a broken one — skip to "Launching without payments".

Two providers are implemented behind the `PaymentProvider` interface in
`lib/payments/index.ts`: Lemon Squeezy and Tap Payments. Neither has been
exercised against a live account from this repository, so treat both as
untested and run a sandbox transaction before pointing customers at either.

### Adding a provider

Whatever provider is chosen implements four methods — `createCheckoutSession`,
`createPortalSession`, `verifyWebhook`, `parseWebhookEvent` — and nothing else
in the application changes. The pieces already in place:

- `app/api/checkout/route.ts` creates the session for a signed-in user and
  never grants Pro itself.
- `app/api/webhooks/payments/route.ts` verifies the signature before it changes
  any subscription, and acknowledges events it cannot act on rather than
  forcing the provider to retry them.
- `lib/entitlements/` reads the resulting plan.

Three things to get right, because each one fails quietly:

1. **Verify the webhook signature over the raw body**, before parsing. The route
   already reads the body exactly once for this reason. Where the provider ships
   its own verification helper, prefer it: a hand-rolled HMAC comparison usually
   omits the timestamp check, which leaves a captured request replayable.
2. **The webhook is the only thing that grants Pro.** A success redirect proves
   the customer reached the "thank you" page, not that money moved. If the
   signing secret is wrong, checkout succeeds and Pro is never granted, with
   nothing user-facing to indicate it. Confirm delivery end to end before taking
   real money.
3. **Update `/terms` and `/privacy` first.** Both currently state that paid
   plans are not active, and `/terms` promises that renewal and refund terms
   will be published before any payment is taken. Publishing them is a
   prerequisite to charging, not a follow-up.

## Launching without payments

Launching free for everyone is fully supported and requires no code change:

- Leave `LEMONSQUEEZY_*` and `TAP_*` unset. `getPaymentProvider()` returns null,
  and `POST /api/checkout` responds `503 {"error":"Checkout is not available
  yet. Please try again later."}`. Pro is never granted by accident.
- Comp individual accounts with the admin grant below.
- Add the provider variables later and redeploy to switch paid plans on.

## Admin and comped accounts

`npm run grant-pro` operates directly on the SQLite database, which means on
this host it is simply run over SSH — no separate production procedure:

```bash
fly ssh console
cd /app
npm run grant-pro -- you@example.com admin      # make yourself an admin
npm run grant-pro -- student@example.com        # grant Pro
npm run grant-pro -- student@example.com free   # revert to Free
```

This needs `tsx`, so it only works if you kept dev dependencies in the image
(constraint 4). Once you are an admin, the Account page exposes a "Grant Pro to
a user" form and you can stop using the CLI.

---

## Security checklist before going live

- `JWT_SECRET` is a strong random value set as a host secret, not the dev
  default, and not committed anywhere.
- `APP_URL` is the real public origin. Confirm:
  `curl -s https://YOUR_DOMAIN/robots.txt` — the `Sitemap:` line must not say
  localhost.
- Exactly one instance is running: `fly scale show` (or the Railway replica
  count) reads 1.
- TLS is live and HSTS is actually being delivered:
  `curl -sI https://YOUR_DOMAIN | grep -i strict-transport-security`
- Security headers are present:
  `curl -sI https://YOUR_DOMAIN | grep -i content-security-policy`
- `/mock` lists numbered exams and one can be started (see "Verifying the live
  site"). An empty list means `assemble` was not run after `seed`.
- A backup has been taken **and restored once** to a scratch path.
- `npm audit --audit-level=moderate` reviewed; anything high or critical
  addressed.
- No `.env` file with real secrets is sitting on the volume.

## Verifying the live site

Walk the full applicant journey against the real domain, over HTTPS:

1. Sign up for a new account; confirm you land on the dashboard.
2. Practice a topic; confirm worked solutions render (KaTeX included).
3. **Open `/mock` and confirm it actually lists numbered exams.** Do not settle
   for a 200 — read the page. An empty list here is the signature of `assemble`
   not having run (see Step 3), and it is indistinguishable from "no mocks
   published yet" unless you know to look. Then **start one** and confirm you
   land in the runner rather than bouncing back to `/mock`.
4. Answer a few questions in the timed mock, refresh, and confirm autosave
   restored your answers.
5. Submit; check the score and per-topic breakdown.
6. Restart the machine (`fly machine restart`) and sign in again — this is the
   step that actually proves the volume is persisting. If your account is gone,
   the volume is not mounted where you think it is.

Do this over `https://`, not over a plain-HTTP IP. `lib/auth.ts:169` sets the
session cookie with `secure: process.env.NODE_ENV === "production"`, so a
production build reached over plain HTTP will appear to accept your login and
then behave as if you are signed out — the browser refuses to store the cookie.
That symptom is a missing TLS terminator, not a broken auth system.

There is no `/api/health` endpoint in this codebase, and there is no good
substitute. Point the host's health check at `/` to confirm the process is
listening, but understand its limits: `/` is statically prerendered at build
time, so it returns 200 with a completely broken or unmounted volume. It proves
the server is up and nothing more. Step 5 of the walkthrough above — restart,
then sign in — is the only check here that actually exercises persistence, and
it is a manual one.

## Routine operations

- **Rolling `JWT_SECRET`**: set the new value and redeploy. Every existing
  session becomes invalid and all users are signed out. Do it immediately if you
  suspect the secret leaked.
- **Log inspection**: `fly logs`. The rate limiter and auth failures surface
  there.
- **Disk headroom**: `fly volumes list`. The database is a few hundred MB at
  most in normal use, but a `-wal` file grows between checkpoints; a volume that
  fills makes every write fail.
- **Content updates**: see the warning in Step 3. Back up first.

---

## Postgres, later

`supabase/migrations/` holds `001`-`008`. A Supabase project exists and all
eight have been applied to it, so the Postgres schema is real and current rather
than aspirational. **No application code reads it**, and the port has not been
done — the sections below are a scope estimate, not instructions you can follow.

Two defects were found and fixed while applying them, both of which would only
have surfaced at query time:

- `001` granted `authenticated` a plain `SELECT` on `questions` and
  `question_options`. RLS filters rows, not columns, so that covered
  `final_answer`, `explanation_steps` and `is_correct` — the entire answer key,
  readable by any signed-in student straight from PostgREST. `005` removes those
  policies; the tables now have RLS enabled with no policy, which denies by
  default, and the server reaches them with the service role.
- `002`'s "admins read all profiles" policy queried `profiles` from inside a
  policy *on* `profiles`, which Postgres aborts with error 42P17, infinite
  recursion. `005` replaces it with a `SECURITY DEFINER` function.

`006` revokes RPC access to the trigger function `handle_new_user()`, which was
callable by `anon`. `007` drops two views added in `005` that could not work.
`008` adds the password reset table.

Note that the Postgres schema keys users to `auth.users` through a `profiles`
table, while the running application has its own `users` table with a bcrypt
hash. Porting means choosing between keeping that scheme and moving to Supabase
Auth; the latter invalidates every existing password.

Porting would mean rewriting every caller of `getDB()`:

```
app/(app)/account/actions.ts        lib/attempts.ts
app/api/attempts/[id]/time/route.ts lib/auth.ts
app/api/webhooks/payments/route.ts  lib/db/queries.ts
lib/account.ts                      lib/entitlements/index.ts
lib/rate-limit.ts                   lib/db/sqlite.ts
scripts/seed.ts                     scripts/assemble-papers.ts
scripts/grant-pro.ts
```

Beyond swapping the driver, the real work is:

- **Synchronous to asynchronous.** `better-sqlite3` is synchronous; every
  Postgres client is not. Each of the files above becomes `async`, and so does
  everything that calls them, transitively.
- **SQL dialect.** The schema uses `INTEGER` booleans, `TEXT` timestamps with
  `datetime('now')`, and `INSERT OR IGNORE` — all of which need Postgres
  equivalents (`boolean`, `timestamptz`/`now()`, `ON CONFLICT DO NOTHING`).
- **Schema divergence.** The SQLite schema in `lib/db/sqlite.ts` has drifted
  from the migrations: SQLite has a `users` table, while the migrations model
  `profiles`. Reconcile before porting anything.
- **Rate limiting.** `lib/rate-limit.ts` becomes correct across instances once
  the counters are in Postgres — which is also the point at which running more
  than one instance becomes possible.
- **The seed.** `scripts/seed.ts` imports `lib/db/sqlite` directly and speaks
  only SQLite. It cannot be pointed at a Postgres database as written.

Until that work is done and verified query by query, the deployment described in
this guide — one process, one volume, one SQLite file — is the supported one.
