# AMP Prep: Final Build Report

## GENERATION COMPLETE

### Question Bank
- AMP1: 2997 questions across all 20 topics
- AMP2: 792 questions across all 12 precalculus topics
- Total: 3789 published questions, 1204 marked free
- 69 assembled papers: 10 free AMP1, 40 pro AMP1, 19 pro AMP2
- All questions include full worked solutions, distractor rationales, concept summaries
- All math in LaTeX rendered with KaTeX

### API Usage
- 5366 successful API requests across 6 Gemini models
- 12 API keys with multi-model rotation (gemini-2.5-flash, 2.5-flash-lite, 3.5-flash, flash-latest, 3-flash-preview, 3.1-flash-lite)
- Zero-cost generation using free tier quotas

### Topics Covered (32 total)
AMP1 (20 topics, 150 questions each):
Real Number System, Whole Numbers and Integers, Fractions, Decimals, Percent,
Solving Equations, Formula Rearrangement, Laws of Exponents, Negative Exponents,
Polynomials, Factoring, Rational Expressions, Geometry, Equation of the Line,
Systems of Equations and Inequalities, Trigonometry, Data Management, Functions,
Logarithms, Word Problems

AMP2 (12 topics, ~66 questions each):
Advanced Algebra, Quadratic Functions, Polynomial Functions, Rational Functions,
Exponential Functions, Logarithmic Functions, Composite and Inverse Functions,
Analytic Trigonometry, Trigonometric Equations, Trig Graphs and Transformations,
Sequences and Series, Systems and Matrices

## Website Features (23 routes)

Marketing: Home, Pricing, About, FAQ (with not-affiliated disclaimer)
Auth: Sign up, Sign in, Sign out (JWT + bcrypt)
Dashboard: Entitlement tracking, recent attempts, upgrade CTA
Topics: All 32 topics with progress, AMP2 Pro-locked
Practice: Untimed, immediate feedback with worked solutions
Mock: Brightspace-style rail, timer, autosave, Submit Quiz
Review: Score, per-topic breakdown, full explanations
Account: Profile, plan, upgrade/downgrade
API: Attempts, answers, submit, timer, entitlements, checkout, webhooks

### Security
- Server-side grading for all 5 question types
- Correct answers never sent to client during active attempts
- Server-authoritative timer
- Entitlement enforcement: 20 daily practice, 1 weekly mock, Pro gating

### Testing
- 23 unit tests passing (grading, entitlements, LaTeX sanitizer)

### Tech Stack
- Next.js 16 + TypeScript + Tailwind CSS
- SQLite (local) / Supabase Postgres (production) with RLS
- KaTeX math rendering
- Payment abstraction: Lemon Squeezy (default) + Tap Payments

## How to Run
```bash
cd /Users/syed/Downloads/amp
npm run dev    # http://localhost:3000
npm test       # 23 tests
npm run build  # production build
```

## Git History
16 commits tracking the full build from foundation to completion.
