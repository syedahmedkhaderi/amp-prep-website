# AMP Prep Setup Guide

This guide covers everything needed to run and deploy the AMP Prep platform.

## Quick Start (Local Development)

```bash
bash setup.sh
npm run dev
```

The app runs at http://localhost:3000

## Prerequisites

1. Node.js 18+ (tested with Node 24)
2. The AMP study guide PDF placed in data/source/
3. Gemini API keys in scripts/.env for question generation

## Environment Variables

### App environment (.env)
Copy from .env.example and fill in:

```
JWT_SECRET=your-secret-key-at-least-32-chars
APP_NAME=AMP Prep
APP_URL=http://localhost:3000
```

For production with Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For payments:
```
PAYMENT_PROVIDER=lemonsqueezy
LEMONSQUEEZY_API_KEY=your-api-key
LEMONSQUEEZY_STORE_ID=your-store-id
LEMONSQUEEZY_PRO_VARIANT_ID=your-variant-id
LEMONSQUEEZY_WEBHOOK_SECRET=your-webhook-secret
```

### Scripts environment (scripts/.env)
Only needed for question generation, not for running the app:
```
GEMINI_API_KEYS=key1,key2,...,key12
GEN_PER_DIFFICULTY=6
```

## Question Generation Pipeline

The website contains no AI at runtime. Questions are generated offline:

1. Parse the PDF:
   ```bash
   npm run parse-pdf
   ```
   This sends the study guide to Gemini and extracts the topic outline.

2. Generate questions:
   ```bash
   npm run generate
   ```
   Uses the 12-key rotator to generate original questions across all topics.

3. Verify questions (optional, independent solve):
   ```bash
   npm run verify
   ```

4. Seed the database:
   ```bash
   npm run seed
   ```

5. Assemble papers:
   ```bash
   npm run assemble
   ```

After the bank is generated and seeded, the Gemini keys and generation scripts
are no longer needed. The live site reads only published questions from the
database.

## Manual Setup Checklist (Production)

1. **Supabase.** Create a project. Copy the project URL, anon key, and service
   role key. Run the migration at supabase/migrations/001_initial_schema.sql.
   Enable email auth.

2. **Payments (Lemon Squeezy).** Create an account and store. Create the Pro
   product at $10/month and the optional 3 month season pass at $24. Copy the
   API key and webhook signing secret. Set the webhook URL to
   https://yourdomain.com/api/webhooks/payments. Test in sandbox first.

3. **Environment variables.** Fill .env from .env.example with production values.

4. **Generate and review questions.** Run the pipeline scripts, then publish
   the generated questions.

5. **Deploy.** Connect the repo to Vercel, set environment variables, deploy.
   Point the custom domain.

6. **Smoke test.** Sign up, practice, run a mock, do a sandbox upgrade.

## Key Decisions

- **Payment model:** Lemon Squeezy as Merchant of Record (default). Tap Payments
  documented as alternative for local Qatar cards.
- **Price:** $10/month for Pro, or $24 for a 3 month season pass.
- **Question source:** Pre-generated, human-reviewed bank. No runtime AI.
- **Database:** SQLite for local development, Supabase Postgres for production.

## Disclaimer

AMP Prep is an independent study tool. It is not affiliated with, endorsed by,
or connected to the University of Doha for Science and Technology. UDST is a
trademark of its respective owner. The platform helps students prepare for the
UDST AMP tests but does not claim any official status.
