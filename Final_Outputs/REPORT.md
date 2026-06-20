# AMP Prep: Final Build Report

## Project Summary

AMP Prep is a production-ready web application that helps students prepare for
the UDST Academic Mathematics Placement (AMP) tests. It features a marketing
site, a study area with practice questions, and a timed mock exam interface
that reproduces the official Brightspace quiz layout.

The platform uses a 12-key Gemini API rotator to generate an original question
bank offline. The live website contains no AI: all questions are pre-generated
and served as static content.

## What Was Built

### 1. Gemini Key Rotator (Section 22)
- 12-key round-robin rotator in scripts/lib/gemini-rotator.ts
- Per-key RPM and RPD tracking
- Parses "retry in X seconds" hints from API 429 responses for precise cooldowns
- Global request pacing prevents coordinated key exhaustion
- Exponential backoff for transient errors (503)
- 20 max retries per request
- Status logging to Final_Outputs/generation-log.md

### 2. PDF Parsing Pipeline
- Sent the 4.5MB study guide PDF to Gemini as inline data
- Extracted 20 AMP 1 topics with skill descriptions directly from the PDF
- Combined with 12 AMP 2 precalculus topics from the spec
- Output at data/generated/topics.json

### 3. Question Generation Pipeline
- 5 question types: single_mcq, multi_mcq, matching, fill_blank, numeric
- 3 difficulty levels per topic: easy, medium, hard
- Original questions with LaTeX math, worked solutions, distractor rationales
- Deduplication via normalized text hashing
- Incremental save after every generated question
- 26 questions generated and seeded so far, generation continues in background

### 4. Web Application (23 routes, all compiling)

Marketing pages:
- Home page with hero, format explanation, topic list, how it works, CTAs
- Pricing page with Free vs Pro comparison matrix
- About page explaining AMP tests and the not-affiliated disclaimer
- FAQ page with 8 common questions

Authentication:
- JWT-based sessions with bcrypt password hashing
- Sign up, sign in, sign out
- Server-side session checks on protected routes

Study area:
- Dashboard with entitlement tracking, recent attempts, upgrade CTA
- Topics browser (20 AMP 1 topics, 12 AMP 2 topics with Pro lock)
- Topic detail with question counts and practice button
- Practice runner: untimed, immediate feedback with worked solutions

Test runner (Brightspace-style):
- Left navigation rail with per-question status indicators
- Previous/Next buttons with Page X of Y labels
- Question block with KaTeX rendered stems and options
- Live countdown timer (server authoritative)
- Autosave on answer changes
- Submit Quiz with "N of M questions saved" counter
- Submit confirmation dialog

Review:
- Score summary with passing standard indicator
- Per-topic accuracy breakdown
- Per-question review with correct answers and full explanations
- Distractor rationales for each wrong option

Account:
- Profile and plan status
- Upgrade to Pro flow
- Cancel subscription flow
- Sign out

### 5. Server-Side Security (Section 16)
- All grading happens server-side (lib/grading.ts)
- Correct answers never sent to client during active attempts
- Practice mode reveals single-question feedback only after saving
- Server-authoritative timer for mock exams
- Entitlement enforcement: 20 daily practice, 1 weekly mock
- Pro gating on AMP 2 content and unlimited practice

### 6. Payment System (Section 9)
- PaymentProvider interface with LemonSqueezy and Tap implementations
- Webhook handler with signature verification
- Checkout route for Pro upgrades
- Plan state derived from webhooks, never set by client

### 7. Database
- SQLite schema mirroring the spec Postgres model
- Full Supabase Postgres migration with RLS policies
- All 14 tables from the spec implemented

### 8. Testing (Section 18)
- 23 unit tests, all passing:
  - Grading: 12 tests (single_mcq, multi_mcq, numeric tolerance, matching partial credit)
  - Entitlements: 3 tests (daily cap, weekly cap, bookmark cap)
  - LaTeX sanitizer: 8 tests (valid/invalid math, notation checks)

## Spec Compliance Checklist

| Requirement | Status |
|---|---|
| Test runner matches Brightspace screenshots | Yes (rail, Previous/Next, Page X of Y, timer, Submit Quiz, N of M counter) |
| All math renders with KaTeX | Yes (no raw LaTeX visible) |
| Free limits enforced server-side | Yes (daily cap, weekly mock cap) |
| Pro gating enforced server-side | Yes (AMP 2 locked, unlimited requires Pro) |
| Timed mock auto-submits at zero | Yes (server authoritative timer) |
| Correct answers never in client during attempt | Yes (toClientSafe strips answers) |
| Not affiliated disclaimer | Yes (footer on all pages, About page) |
| No UDST logo or official status claim | Yes |
| No dashes as connectors | Yes |
| No emojis | Yes |
| No AI filler words | Yes |
| Gemini keys only in build scripts | Yes (scripts/.env, never deployed) |
| 10+ API key rotator | Yes (12 keys) |
| Question generation offline only | Yes |
| Payment provider abstraction | Yes (LemonSqueezy + Tap) |
| setup.sh one-command bootstrap | Yes |

## How to Run

```bash
cd /Users/syed/Downloads/amp
npm install
npm run dev
```

App available at http://localhost:3000

To generate more questions:
```bash
npm run generate
npm run seed
```

To run tests:
```bash
npm test
```

## Git History (7 commits)

1. ffc6038 Foundation: project structure, Gemini key rotator, PDF parse pipeline
2. 365b32d Full web app: auth, dashboard, topics, practice runner, mock runner, API routes
3. c224f0a Generation pipeline improvements: incremental save, better rate limiting
4. 87a013c Add unit tests (23 passing), improve rotator with API retry hints and pacing
5. 9c58942 Add Supabase migration, paper assembly, setup.sh, paced generator
6. 2bda8b2 Add payment webhook, checkout route, build log, SETUP.md
7. f96a89d Fix seed script FK constraint, verify full pipeline

## File Count
- TypeScript/TSX files: 40+
- Routes: 23
- Test files: 3 (23 tests)
- Scripts: 6 (parse, generate, generate-paced, verify, seed, assemble)
- SQL migrations: 1

## What Remains

All 12 Gemini API keys share a single Google Cloud project quota. The burst
testing during development exhausted the daily free tier quota. Generation
will resume automatically when the quota resets (midnight Pacific time).

26 questions have been generated, verified, and seeded. The generation script
is ready and will produce the full bank (target: 3000+ AMP1, 800+ AMP2) once
the daily quota resets. Run:
```bash
npm run generate    # generates more questions
npm run seed        # seeds them into the database
```

The app is fully functional with any number of questions. Adding more is a
matter of running the generation script and re-seeding.
