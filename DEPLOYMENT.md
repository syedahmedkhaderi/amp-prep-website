# Deploying AMP Prep

This guide takes AMP Prep from the local development build to a live website that
applicants can use, hosted on Vercel with a Supabase Postgres database and Lemon
Squeezy for Pro subscriptions.

Read the whole guide once before you start. The steps are ordered so each one
builds on the last.

## Architecture at a glance

```
Applicant browser
      |
      v
Vercel (Next.js app, server rendered)
      |                         |
      v                         v
Supabase Postgres        Lemon Squeezy
(users, questions,       (hosted checkout
 attempts, billing)       and webhooks)
```

- Vercel runs the Next.js application and all server routes.
- Supabase stores every row: profiles, the question bank, attempts, and billing
  state. Supabase Auth manages sign in and sign up.
- Lemon Squeezy hosts the checkout page and notifies the app through a signed
  webhook when a subscription starts, renews, or cancels.

## Current state and the one remaining engineering step

The application code in this repository currently runs against a local SQLite
database (`lib/db/sqlite.ts`) with a lightweight JWT session (`lib/auth.ts`).
That is ideal for local development and for the offline question pipeline, and it
is fully tested.

Serverless hosting like Vercel cannot persist a local SQLite file between
requests, so production uses Supabase Postgres instead. The schema and security
policies are ready in `supabase/migrations`. The remaining engineering step is to
point the data access layer (`lib/db/queries.ts`, `lib/attempts.ts`,
`lib/entitlements/index.ts`) and authentication (`lib/auth.ts`) at Supabase. That
change touches every database call and must be verified query by query against a
live Supabase project, so it is best done with the project created in step 1
below already in hand.

Everything else in this guide (project setup, environment variables, payments,
domain) is ready now and does not change.

## Prerequisites

- A GitHub account with this repository pushed to it.
- A Vercel account (the Hobby tier is enough to start).
- A Supabase account (the Free tier is enough to start).
- A Lemon Squeezy account for payments (you can launch without this and add it
  later; see "Launching without payments").
- Node.js 20 or newer locally (see `.nvmrc`).

## Step 1: Create the Supabase project and schema

1. In the Supabase dashboard, create a new project. Choose a region close to your
   applicants and set a strong database password.
2. Open the SQL Editor and run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_profiles_and_roles.sql`
3. Confirm the tables exist under Database, Tables. You should see `profiles`,
   `subscriptions`, `exams`, `topics`, `questions`, `attempts`, and the rest.
4. From Project Settings, API, copy these three values for later:
   - Project URL (this is `NEXT_PUBLIC_SUPABASE_URL`)
   - `anon` public key (this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role` secret key (this is `SUPABASE_SERVICE_ROLE_KEY`, server only,
     never expose it to the browser)

## Step 2: Seed the question bank into Supabase

The question bank is generated offline and stored as JSON in
`data/generated/questions.json` and `data/generated/topics.json`.

To load it into Supabase, run the seed against the production database as part of
the cutover described above. The seed reads the same JSON files the local seed
uses and inserts topics, questions, options, matches, and numeric answers, then
marks the free tier subset. Run it once after the schema is in place. Verify the
counts in the Supabase Table editor afterward (published questions, free
questions, topics).

## Step 3: Configure environment variables

Copy `.env.example` to understand the full set. In production these are set in the
Vercel dashboard, not in a file. The complete list:

```
NEXT_PUBLIC_SUPABASE_URL       Project URL from step 1
NEXT_PUBLIC_SUPABASE_ANON_KEY  anon public key from step 1
SUPABASE_SERVICE_ROLE_KEY      service_role secret key from step 1

PAYMENT_PROVIDER               lemonsqueezy
LEMONSQUEEZY_API_KEY           from step 5
LEMONSQUEEZY_STORE_ID          from step 5
LEMONSQUEEZY_PRO_VARIANT_ID    from step 5
LEMONSQUEEZY_WEBHOOK_SECRET    from step 5

APP_NAME                       AMP Prep
APP_URL                        your live URL, for example https://amp-prep.vercel.app
JWT_SECRET                     a strong random secret (see below)
```

Generate a strong `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

The application refuses to start in production if `JWT_SECRET` is missing or left
at the development default, so do not skip this.

## Step 4: Deploy to Vercel

1. In Vercel, click Add New, Project, and import this GitHub repository.
2. Vercel detects Next.js automatically. Leave the build command and output
   settings at their defaults.
3. Under Settings, Environment Variables, add every variable from step 3 for the
   Production environment (and Preview if you want preview deploys to work).
4. Deploy. When it finishes you get a URL like `https://amp-prep.vercel.app`.
5. Set `APP_URL` to that URL and redeploy so payment redirects point to the right
   place.

## Step 5: Set up Lemon Squeezy payments

1. In Lemon Squeezy, create a Store, then a Product for "AMP Prep Pro" with a
   monthly subscription variant at your price (for example 10 USD per month).
2. Copy the Store ID and the Variant ID into `LEMONSQUEEZY_STORE_ID` and
   `LEMONSQUEEZY_PRO_VARIANT_ID`.
3. Under Settings, API, create an API key and put it in `LEMONSQUEEZY_API_KEY`.
4. Under Settings, Webhooks, add a webhook:
   - URL: `https://YOUR_DOMAIN/api/webhooks/payments`
   - Signing secret: choose a strong value and put the same value in
     `LEMONSQUEEZY_WEBHOOK_SECRET`
   - Events: subscription created, updated, and cancelled
5. Redeploy so the new variables take effect.

The webhook handler verifies the signature with HMAC SHA256 and a constant time
comparison before it changes any subscription, so an unsigned or tampered request
is rejected. The checkout route never grants Pro on its own; Pro is only set when
a verified webhook arrives or an admin grants it.

### Testing the payment flow

1. Use Lemon Squeezy test mode and a test card to complete a checkout.
2. Confirm the webhook is received (Lemon Squeezy shows delivery status) and the
   account page shows the PRO badge.
3. Cancel the test subscription and confirm the account reverts to Free.

## Step 6: Create the first admin and comp accounts

The admin account page can grant Pro to selected users without a payment.

- To make yourself an admin in local development:
  `npm run grant-pro -- you@example.com admin`
- In production, set the same on the `profiles` row in Supabase:
  `update profiles set role = 'admin' where email = 'you@example.com';`

Once you are an admin, the Account page shows a "Grant Pro to a user" form. To
grant Pro directly in Supabase instead:
`update profiles set plan = 'pro' where email = 'student@example.com';`

## Step 7: Add a custom domain (optional, later)

You can launch on the `vercel.app` subdomain and add a domain whenever you are
ready.

1. Buy a domain from any registrar.
2. In Vercel, Settings, Domains, add your domain. Vercel shows the DNS records to
   create.
3. At your registrar, add the records Vercel lists (an A record or a CNAME, plus
   any verification record). Propagation usually takes minutes to a few hours.
4. Update `APP_URL` to the new domain and update the Lemon Squeezy webhook URL to
   the new domain, then redeploy.

## Launching without payments

If you want to launch free for everyone first:

- Leave the `LEMONSQUEEZY_*` variables unset. The checkout route returns a clear
  "checkout is not available yet" message and never grants Pro.
- Use the admin grant or the Supabase SQL above to comp specific Pro accounts.
- Add the Lemon Squeezy variables later and redeploy to turn on paid plans.

## Security checklist before going live

- `JWT_SECRET` is a strong random value, set in Vercel, not the default.
- `SUPABASE_SERVICE_ROLE_KEY` is set only as a server variable, never with the
  `NEXT_PUBLIC_` prefix.
- Row Level Security is enabled on every user data table (it is, in migration
  001). Verify under Database, Policies.
- The Lemon Squeezy webhook secret matches on both sides.
- Run `npm audit --audit-level=moderate` and address anything high or critical.
- Confirm the security headers are present on the live site:
  `curl -sI https://YOUR_DOMAIN | grep -i content-security-policy`

## Verifying the live site

After deploy, walk through the full applicant journey:

1. Sign up for a new account, confirm you land on the dashboard.
2. Practice a topic and confirm worked solutions appear.
3. Start a timed mock, answer a few questions, refresh, and confirm autosave
   restored your answers.
4. Submit and review the score and per topic breakdown.
5. Upgrade through checkout (test mode) and confirm Pro unlocks.

## Routine operations

- Regenerate or extend the question bank with the scripts in `scripts/`, then run
  the seed again.
- Roll the `JWT_SECRET` if you suspect it leaked; this signs every user out.
- Monitor Supabase usage and Vercel analytics as traffic grows.
