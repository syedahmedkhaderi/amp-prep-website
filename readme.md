# AMP Prep

AMP Prep is a practice platform for students preparing for the UDST Academic Mathematics Placement tests, AMP 1 and AMP 2. It provides topic practice, timed mock exams, worked solutions, and a quiz interface modeled after the official test layout.

AMP Prep is independent project by a university student. It is not affiliated with, endorsed by, or connected to the University of Doha for Science and Technology.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, SQLite for local development, Vitest, Playwright, and KaTeX.

## Quick Start

```bash
./setup.sh
```

The app starts at: http://localhost:3000

Use another port if needed:

```bash
PORT=3001 ./setup.sh
```

Skip verification during local startup:

```bash
SKIP_CHECKS=1 ./setup.sh
```

## Commands

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

## Project Structure

```text
app/                 Routes, pages, and API handlers
components/          Test runner and shared UI
lib/                 Auth, attempts, grading, database, payments, and math helpers
scripts/             Offline question pipeline and seed scripts
tests/               Vitest coverage
data/                Local database, source files, and generated question data
supabase/            Postgres schema and row level security for production
```

## Deployment

See DEPLOYMENT.md for the full guide to running AMP Prep as a live website on
Vercel with a Supabase Postgres database and Lemon Squeezy payments.

