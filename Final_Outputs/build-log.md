# AMP Prep Build Log

## Milestone Progress

### M1. Foundation - COMPLETE
- Next.js 16 + TypeScript + Tailwind CSS project initialized
- Brand design tokens defined (brand-deep #0A2C6B, quiz-blue #0A5CAB)
- Full directory structure matching the spec
- KaTeX math rendering components (Katex.tsx, MathText)
- LaTeX sanitizer with notation validation
- Git initialized with 5 commits

### M2. Data Model - COMPLETE
- SQLite schema mirroring the spec Postgres model
- All tables: profiles/subscriptions (via users), exams, topics, questions,
  question_options, question_matches, question_match_choices, numeric_answers,
  papers, paper_questions, attempts, attempt_questions, attempt_answers,
  question_reports
- Supabase Postgres migration with full RLS policies
- Row Level Security equivalent via server-side queries

### M3. Auth - COMPLETE
- JWT based session auth with bcrypt password hashing
- Sign up creates user with plan=free, role=student
- Sign in validates credentials and sets session cookie
- Protected (app) route group with server-side session check
- Sign out clears session

### M4. Question Pipeline - IN PROGRESS
- PDF parsed by Gemini: 20 AMP1 topics with skill descriptions extracted
- Question generation script with 5 question types operational
- Gemini key rotator with 12 keys, RPM/RPD tracking, API retry hints, global pacing
- 26+ questions generated so far, generation continues in background
- Seed script loads questions into database
- Questions verified rendering with KaTeX in the practice runner

### M5. Practice Runner - COMPLETE
- Untimed practice with server-side feedback after each saved answer
- Immediate feedback: correct/incorrect, final answer, worked solution steps,
  concept summary, distractor rationales
- Daily cap enforced server-side (20 questions for free users)
- Progress dots and saved counter
- All 5 question types render and function correctly
- Verified in browser: answer selection, save, feedback display

### M6. Test Runner and Mock - COMPLETE
- Brightspace-style quiz interface with left navigation rail
- Previous/Next buttons with Page X of Y labels
- Live countdown timer (server authoritative)
- Autosave on answer change
- Submit Quiz button with "N of M questions saved" counter
- Submit confirmation dialog
- Auto-submit when timer reaches zero
- Rail shows checkmark for saved questions

### M7. Payments and Gating - COMPLETE
- PaymentProvider interface with LemonSqueezy and Tap implementations
- Server-side plan checks in all Pro-gated routes
- AMP 2 content locked for free users
- Account page with upgrade/downgrade flow
- Webhook handler structure ready

### M8. AMP 2 and Analytics - PARTIAL
- AMP 2 topics defined and displayed with Pro lock
- Topic breakdown in attempt review
- Analytics requires more question data (generation ongoing)

### M9. Marketing Pages - COMPLETE
- Home page with hero, format explanation, topic list, how it works, CTA
- Pricing page with Free vs Pro comparison matrix
- About page with AMP explanation and disclaimer
- FAQ page with 8 common questions
- Not affiliated disclaimer in footer of all pages

### M10. Hardening and Tests - PARTIAL
- 23 unit tests passing (grading for all types, entitlements, LaTeX sanitizer)
- Server-side grading enforced
- Correct answers never sent to client during active attempts
- Remaining: more E2E tests, full security test suite

## Test Results
- Unit tests: 23/23 passing
  - Grading: 12 tests (single_mcq, multi_mcq, numeric tolerance, matching partial credit)
  - Entitlements: 3 tests (daily cap, weekly cap, bookmark cap constants)
  - LaTeX sanitizer: 8 tests (valid/invalid math, notation checks)

## Verification
- Next.js build passes (21 routes compile)
- Practice runner verified end-to-end in browser
- Questions render with KaTeX (no raw LaTeX visible)
- Immediate feedback displays correctly after answer
