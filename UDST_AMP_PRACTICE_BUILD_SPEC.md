# UDST AMP Practice Platform: Full Build Specification

This is the single source of truth for building the website. Read this entire file before writing any code. The platform helps applicants to the University of Doha for Science and Technology (UDST) prepare for the Academic Mathematics Placement tests, AMP 1 and AMP 2, with a practice experience and a timed mock test that mirrors the look and behavior of the official quiz interface.

The build runs autonomously. Work through the milestones in order, verify each milestone against its acceptance checks before moving to the next, and do not stop until the Definition of Done at the end of this file is met.

---

## 0. How to use this file (read first)

1. Read `agents.md` in the project root first on every session. If it does not exist, create it from the template in Appendix A before doing anything else.
2. The project folder also contains:
   - `/data/source/` holding the uploaded AMP 1 study guide PDF.
   - `/reference/screenshots/` holding the interface screenshots. These screenshots are the visual source of truth for the test runner. Match them.
3. Tasks are numbered. Produce the deliverable for a task, show the result, then save it to the path stated. Do not update `agents.md` until a milestone is confirmed complete.
4. Output files for the agent's own notes go to `/Final_Outputs/`.
5. Writing rules for every piece of user facing copy and every code comment in this project:
   - No dashes used as sentence connectors. Use commas, colons, or separate sentences.
   - No emojis anywhere.
   - No filler words such as "delve", "tapestry", "seamless", "unlock", "elevate", "robust", "leverage" used as marketing fluff.
   - Plain first person or direct second person, active voice, specific numbers over vague claims.
   - The interface must not look like a generic AI generated template. It must look like a focused study tool built for students.

---

## 1. Project summary

Build a production ready web application with three core experiences:

1. A marketing home page that explains what the platform does and converts visitors to sign up.
2. A study area where a signed in student browses AMP 1 and AMP 2 topics, practices questions with worked solutions, and tracks weak areas.
3. A test runner that reproduces the official quiz interface so a student feels familiar with the format on exam day. It supports an untimed practice mode and a timed full length mock that matches the real exam structure.

Free users get a genuinely useful daily practice allowance and one timed mock. Pro users pay a low monthly price and get unlimited practice, AMP 2 content, full worked solutions, analytics, and more practice papers. There is no AI feature inside the website. All questions are pre generated offline and served as static content. See Section 22.

There is no lockdown browser. The screenshots show one because UDST uses Respondus LockDown Browser, but we do not replicate that. We replicate the quiz layout and behavior only.

---

## 2. Non negotiable constraints

- The test runner must visually match the screenshots in `/reference/screenshots/`. Sample exact colors and spacing from them.
- All mathematics renders with KaTeX from LaTeX source. No ASCII math. No caret notation like `x^2` shown raw, no `->` for arrows, no apostrophe based notation. Use `x^{2}`, `\frac{a}{b}`, `\sqrt{x}`, `\rightarrow`, and so on.
- Free tier limits and Pro gating are enforced on the server. Never trust the client for entitlement or for correct answers.
- The platform is an independent study tool. It is not affiliated with, endorsed by, or connected to UDST. A clear disclaimer to that effect appears in the footer and in the About section. Do not use the UDST logo or claim any official status. You may state factually that the platform helps students prepare for the UDST AMP tests.
- Practice questions are original items generated to match the topics, difficulty, and style of the AMP tests. Do not republish the exact copyrighted questions from the UDST study guide PDF on the live site. Use the PDF only to model topics, difficulty, and question style. See Section 10.

---

## 3. Decisions to confirm before building

Build with the defaults below. These six items are flagged because they change manual setup. If the owner has not answered them, proceed with the stated default and leave the alternative path documented and switchable.

1. **Payment model. Default: Merchant of Record using Lemon Squeezy.** A Merchant of Record collects the money, handles tax and VAT, and pays out to the owner. This avoids needing a registered Qatar business and a local merchant bank account, which is the fastest legitimate path for an individual. The documented alternative is a local Qatar gateway (Tap Payments or MyFatoorah), which needs a registered Qatar business and pays out within the GCC but gives local cards and QAR pricing. Build a thin payment provider abstraction so switching providers touches one module only.
2. **Merchant entity and country.** Lemon Squeezy onboards individual sellers in many countries. Confirm the seller country so the manual setup checklist is correct. This only affects setup, not code.
3. **Question source: a pre generated, human reviewed question bank** stored in the database. This is the only source. The website serves static questions and contains no AI at runtime.
4. **Question generation tool: Gemini, used offline only, during the build.** Questions and their explanations are generated by Gemini through a key rotator that cycles ten API keys, then verified and reviewed, then seeded into the database. Gemini keys live only in the build scripts environment, never in the deployed app. After the bank is generated, the generation scripts and keys can be removed and the live site keeps working with zero AI dependency. Full details in Section 22.
5. **Price and currency. Default: 10 USD per month for Pro**, with an optional 3 month exam season pass at a discount. Confirm whether to show QAR (about 36 QAR per month) instead of or alongside USD.
6. **Product name and domain.** Pick a name that does not imply official UDST status. The build uses the placeholder name "AMP Prep" until told otherwise. Replace the placeholder in one config file.

---

## 4. Domain knowledge: what the AMP tests are

This grounds the question bank, the topic structure, and the mock test settings. Refine the AMP 1 topic list against the actual uploaded study guide PDF once it is parsed.

### AMP overview

The Academic Mathematics Placement is administered at the UDST Testing Centre. It has two parts.

- **AMP 1.** A computer based test of basic high school mathematics. 60 multiple choice questions across 20 topic areas. Time limit 2 hours. Every applicant must take it. The score determines the math admission outcome. A passing standard around 60 percent is commonly required, and a high score on AMP 1 is the gate to AMP 2. A simple scientific calculator (Casio fx-85ES class) is provided at the centre, so practice questions should be solvable with that level of tool.
- **AMP 2.** A test of advanced skills covering advanced algebra and functions, analytical trigonometry, and other precalculus topics. Only students with a high AMP 1 score are eligible. It determines exemption from undergraduate math courses. There are no public sample papers for AMP 2, so its content is built entirely from the topic descriptions below and standard precalculus scope.

### AMP 1 topic areas (target 20, refine from the PDF)

1. Arithmetic with integers, order of operations
2. Fractions and mixed numbers
3. Decimals and rounding
4. Ratios, proportions, and rates
5. Percentages and percentage change
6. Exponents and powers
7. Roots and radicals
8. Scientific notation
9. Algebraic expressions and simplification
10. Linear equations in one variable
11. Linear inequalities
12. Systems of linear equations
13. Polynomials and operations on them
14. Factoring
15. Rational expressions
16. Coordinate geometry and equations of lines
17. Functions and function notation, basics
18. Perimeter, area, and volume
19. Right triangle and basic trigonometric ratios
20. Basic statistics and probability, word problems

### AMP 2 topic areas (precalculus scope)

1. Advanced algebraic manipulation and equations
2. Quadratic functions and the quadratic formula
3. Polynomial functions and their graphs
4. Rational functions and asymptotes
5. Exponential functions and growth and decay
6. Logarithmic functions and properties of logarithms
7. Composite and inverse functions
8. Analytic trigonometry, identities
9. Trigonometric equations
10. Graphs of trigonometric functions and transformations
11. Sequences and series
12. Systems and matrices, introductory

### Mock test settings

- AMP 1 mock: exactly 60 questions, 120 minute countdown, single attempt unit, drawn across the 20 topics in roughly even proportion, difficulty ordered from easier to harder as the official test does.
- AMP 2 mock: 40 questions, 90 minute countdown, Pro only, drawn from the precalculus topics.

---

## 5. Technology stack and architecture

Use this stack. It is chosen for a single builder, a fast deploy, and minimal manual setup.

- **Framework:** Next.js with the App Router and TypeScript.
- **Styling:** Tailwind CSS with a small set of design tokens defined in one file. See Section 14.
- **Backend and database:** Supabase, providing Postgres, authentication, file storage, and Row Level Security. All data access from the client goes through Supabase with RLS enforced. Privileged actions go through Next.js server routes using the service role key, never exposed to the browser.
- **Math rendering:** KaTeX, through `rehype-katex` for static content and `react-katex` for dynamic content.
- **Payments:** Lemon Squeezy by default, behind a `PaymentProvider` interface in `/lib/payments/`. Tap Payments documented as the alternative implementation.
- **Offline pipeline:** TypeScript scripts in `/scripts/` for PDF parsing, question generation, verification, and database seeding.
- **Testing:** Vitest for unit tests, Playwright for end to end tests.
- **Hosting:** Vercel for the app, Supabase managed for the backend.

Architecture in one line: a Next.js app on Vercel talks to Supabase for auth and data, gates Pro features on the server using subscription state kept in sync by payment webhooks, and renders a question bank that was generated and reviewed offline.

---

## 6. Repository structure

```
/app
  /(marketing)            public pages: home, pricing, about, faq
  /(auth)                 sign in, sign up, reset password
  /(app)                  authenticated area
    /dashboard
    /topics
    /topics/[slug]
    /practice/[topicSlug]
    /mock/[examCode]
    /attempt/[attemptId]/review
    /account
  /api
    /webhooks/payments    provider webhook handler with signature check
    /attempts             create attempt, save answer, submit
    /entitlements         server check for free limits and pro status
    /generate             optional pro live generation, flag gated
/components
  /test-runner            the quiz interface components
  /ui                     shared primitives
/lib
  /supabase               client and server helpers
  /payments               PaymentProvider interface and implementations
  /math                   katex helpers and content sanitizer
  /entitlements           limit and gating logic, server only
/scripts
  parse-pdf.ts
  generate-questions.ts
  verify-questions.ts
  seed.ts
/data
  /source                 uploaded PDF
  /generated              intermediate JSON
/reference
  /screenshots            interface screenshots, visual source of truth
/supabase
  /migrations             SQL migrations
agents.md
.env.example
```

---

## 7. Data model

Use Postgres through Supabase. Enable Row Level Security on every table that holds user data. Below are the tables and key fields. Implement them as SQL migrations under `/supabase/migrations`. A representative migration for the core tables is in Appendix B.

- **profiles**: `id` uuid primary key referencing `auth.users`, `full_name`, `role` enum [`student`, `admin`] default `student`, `created_at`. One row per user.
- **subscriptions**: `id`, `user_id` references profiles, `plan` enum [`free`, `pro`] default `free`, `status` enum [`active`, `canceled`, `past_due`, `none`], `provider`, `provider_customer_id`, `provider_subscription_id`, `current_period_end` timestamptz, `created_at`, `updated_at`. Plan state is derived from provider webhooks, never set by the client.
- **exams**: `id`, `code` enum [`AMP1`, `AMP2`], `title`, `description`, `duration_minutes`, `total_questions`.
- **topics**: `id`, `exam_id` references exams, `name`, `slug`, `order_index`, `description`.
- **questions**: `id`, `exam_id`, `topic_id`, `type` enum [`single_mcq`, `multi_mcq`, `matching`, `fill_blank`, `numeric`], `stem` text holding LaTeX and plain text mixed with delimiters, `difficulty` enum [`easy`, `medium`, `hard`], `points` numeric default 1, `explanation` text with LaTeX, `source` enum [`generated`, `curated`], `status` enum [`draft`, `reviewed`, `published`] default `draft`, `is_free` boolean to mark items available to free users, `created_at`.
- **question_options**: `id`, `question_id`, `content` text with LaTeX, `is_correct` boolean, `order_index`. Used by `single_mcq`, `multi_mcq`, and `fill_blank`.
- **question_matches**: for `matching`. Store as `id`, `question_id`, `left_content`, `correct_choice_index`, `order_index`, plus a `match_choices` JSON array on the question for the numbered legend, or a sibling table `question_match_choices`. Match the layout in screenshots two and three: left items each have a numbered dropdown, the right side shows a numbered legend.
- **numeric_answers**: for `numeric`. `id`, `question_id`, `correct_value` numeric, `tolerance` numeric, `accepted_expressions` text array for algebraic equivalents.
- **attempts**: `id`, `user_id`, `exam_id`, `mode` enum [`practice`, `mock`], `topic_id` nullable for topic practice, `started_at`, `submitted_at` nullable, `score` numeric nullable, `total` numeric, `time_limit_seconds` nullable.
- **attempt_questions**: `id`, `attempt_id`, `question_id`, `order_index`. Fixes the question set and order for the attempt so a refresh is stable.
- **attempt_answers**: `id`, `attempt_id`, `question_id`, `response` jsonb, `is_correct` boolean nullable until graded, `points_awarded` numeric, `saved_at`. The response shape depends on question type.
- **question_reports**: `id`, `user_id`, `question_id`, `reason`, `created_at`. Lets students flag a bad question. Admin reviews these.

RLS rules:
- A user can read and write only their own `profiles`, `subscriptions`, `attempts`, `attempt_questions`, `attempt_answers`, and `question_reports` rows.
- `questions`, `question_options`, `question_matches`, `numeric_answers`, `exams`, `topics` are readable by authenticated users, but correct answer fields must not be selectable from the client during an active attempt. Enforce this by grading on the server and by selecting answer fields only in server routes using the service role. For practice mode with immediate feedback, reveal the answer for a single question only after the user has saved a response to that question, through a server route.

---

## 8. Authentication

Use Supabase Auth.

- Email and password sign up with email verification.
- Optional Google sign in if it can be configured without blocking the build.
- Password reset by email.
- On first sign in, create a `profiles` row and a `subscriptions` row with `plan = free`, `status = none`.
- Protect the `(app)` route group with a server side session check. Unauthenticated users are redirected to sign in.
- Store no passwords yourself. Supabase handles hashing and sessions.

Manual setup for auth is listed in Section 20.

---

## 9. Payments, subscription, and tiers

### Provider abstraction

Define a `PaymentProvider` interface in `/lib/payments/index.ts` with methods: `createCheckoutSession(userId, plan)`, `createPortalSession(userId)`, `verifyWebhook(request)`, `parseWebhookEvent(request)`. Implement `lemonSqueezy.ts` first. Document `tap.ts` as the alternative with the same interface.

### Flow

1. A free user clicks Upgrade. The server creates a checkout session for the Pro plan and redirects to the provider hosted checkout. Never set price on the client.
2. The provider processes payment and sends a webhook. The webhook handler verifies the signature, then updates the user's `subscriptions` row: `plan = pro`, `status = active`, `current_period_end` from the event, and stores provider ids.
3. Every Pro action checks subscription state on the server through `/lib/entitlements`. The client may show or hide UI, but the server is the gate.
4. Cancellation and renewal arrive as webhooks and update `status` and `current_period_end`. When a subscription lapses, the user reverts to free automatically.
5. Provide a billing portal link so users manage or cancel their subscription through the provider.

### Free versus Pro feature matrix

| Capability | Free | Pro |
| --- | --- | --- |
| Browse all AMP 1 topics | Yes | Yes |
| Daily practice questions | Up to 20 per day | Unlimited |
| Worked solutions, full step by step explanations | On every question | On every question |
| AMP 1 timed mock, 60 questions, 120 minutes | One per week | Unlimited |
| AMP 2 precalculus content | Locked, preview only | Full access |
| AMP 2 timed mock, 40 questions, 90 minutes | Locked | Unlimited |
| Topic level analytics and weak area targeting | Basic, last attempt only | Full history and trends |
| Retry only the questions you got wrong | Locked | Yes |
| Bookmarks and saved questions | Up to 10 | Unlimited |
| Full length practice papers, 60 questions each | 10 papers | All papers, 40 or more, plus new ones added |

Keep the free tier genuinely useful. The daily allowance and the weekly mock should be enough for a casual user to feel the value before they decide to pay.

### Pricing

- Pro: 10 USD per month. Optional 3 month exam season pass at a discount, for example 24 USD. Confirm currency per Section 3.
- Enforce all of the limits above on the server in `/lib/entitlements`. Examples: count today's answered practice questions for the daily cap, count this week's mock attempts for the weekly cap, check `plan = pro` and `status = active` and `current_period_end` in the future for any Pro gate.

---

## 10. Question ingestion and generation pipeline

This pipeline runs offline through scripts. It produces a reviewed question bank. The live site reads only published questions.

### Principle on the source PDF

The uploaded study guide is copyrighted by UDST. Use it to learn the topics, the difficulty, the calculator level, and the question style. Do not copy its exact questions onto the paid site. Generate original questions that match the same skills. This keeps the product legally clean and still gives students relevant practice.

### Steps

1. **Parse.** `scripts/parse-pdf.ts` loads the PDF from `/data/source`, extracts text, detects question and topic boundaries, and writes a structured outline to `/data/generated/topics.json` describing each topic, the count and difficulty spread of items observed, and representative skill descriptions. Store skill descriptions and difficulty signals, not verbatim question text intended for republication.
2. **Generate.** `scripts/generate-questions.ts` takes the topic outline and produces N original questions per topic per difficulty. For each item it produces: a stem in LaTeX where math appears, the question type, the options or matches or numeric answer, the single correct answer, plausible distractors that reflect common mistakes, and a full worked solution. Output to `/data/generated/questions.json`. A starter generation prompt is in Appendix C.
3. **Verify.** `scripts/verify-questions.ts` independently solves each generated item and compares to the stated answer. Items where the independent solve disagrees are marked `needs_review` and never auto published. It also checks that exactly one correct option exists for single answer items, that LaTeX parses under KaTeX, and that distractors are not duplicates of the answer.
4. **Review.** An admin UI at `/app/(app)/admin` lists items with status `draft` or `needs_review`, renders them exactly as a student would see them, and lets the admin edit, approve to `reviewed`, then publish to `published`. Only `published` items appear to students. Mark a subset `is_free = true` for the free tier.
5. **Seed.** `scripts/seed.ts` loads exams, topics, and published questions into Supabase.

### No runtime generation

The website does not generate questions at runtime and contains no AI feature. Everything below happens offline during the build. The deployed app reads only published questions from the database.

---

## 11. Math rendering specification

- Store math as LaTeX inside delimiters in the `stem`, `content`, and `explanation` fields. Inline math uses single dollar signs, display math uses double dollar signs.
- Render with KaTeX. Pre render static content with `rehype-katex`. Render dynamic content with `react-katex`.
- Authoring rules for every generated and curated item:
  - Fractions: `\frac{a}{b}`, never `a/b` when a true fraction is meant.
  - Exponents: `x^{2}`, `e^{x}`, never a raw caret in display text.
  - Roots: `\sqrt{x}`, `\sqrt[3]{x}`.
  - Multiplication where needed: `\cdot` or `\times`, not an asterisk.
  - Arrows: `\rightarrow`, never `->`.
  - Trig and logs: `\sin`, `\cos`, `\tan`, `\log`, `\ln` as operators.
  - Degrees: `90^{\circ}`.
- Add a content sanitizer in `/lib/math` that validates LaTeX parses under KaTeX before an item can be published. A parse failure blocks publishing.

---

## 12. Pages and routes

### Marketing

- **Home.** Clear headline stating the platform helps you prepare for the UDST AMP 1 and AMP 2 placement tests. A short explanation of the format, sixty questions in two hours for AMP 1. A preview of the test interface. A topic list. A pricing summary. A sign up call to action. The not affiliated disclaimer in the footer.
- **Pricing.** Free versus Pro matrix from Section 9. One primary call to action to start free.
- **About and FAQ.** What the AMP tests are, how the platform helps, the disclaimer, contact.

### Authenticated app

- **Dashboard.** Greeting, a Start practice button, a Take a timed mock button, a weak areas summary, recent attempts, and the current plan with an Upgrade button for free users.
- **Topics list.** All AMP 1 topics, and AMP 2 topics shown with a Pro lock for free users. Each topic shows progress and accuracy.
- **Topic detail.** Description, a Practice this topic button, past accuracy on the topic.
- **Practice runner.** Untimed. Pulls questions for the chosen topic or a mixed set. Immediate feedback after each saved answer, with a hint for free users and a full solution for Pro. Respects the daily cap for free users.
- **Mock runner.** Timed. AMP 1 sixty questions in 120 minutes for everyone within the weekly cap, AMP 2 forty questions in 90 minutes for Pro. Uses the test runner described in Section 13.
- **Attempt review.** After submission, show the score, a per question breakdown with the student's answer, the correct answer, and the explanation, and a per topic accuracy summary. Pro users can launch a retry of only the wrong questions.
- **Account and billing.** Profile, plan status, billing portal link, sign out.
- **Admin.** Question review and publishing, reported questions queue. Restricted to `role = admin`.

---

## 13. Test runner: the quiz interface (match the screenshots)

This is the most important screen. Reproduce the layout and behavior in `/reference/screenshots/`. The screenshots show the official Brightspace quiz view. The red boxes and the green and yellow highlights in some screenshots are a student's own annotations, not interface elements. Ignore them.

### Layout

Two columns inside the app shell.

**Left navigation rail**, fixed width near 140 pixels:
- A vertical list of pages. Each question is its own page, matching the screenshots. Each entry shows a label like "Page 1" then a number tile with the question number, then a status indicator. A checkmark means the question has a saved answer. A short dash means it does not yet.
- Clicking an entry jumps to that question.
- The rail scrolls when there are many questions, and shows a visible scrollbar. Reproduce the thin vertical scrollbar track that appears between the rail and the content in the screenshots.

**Content column:**
- A top control bar with a "Previous Page" button on the left, greyed and disabled on the first question, then a "Next Page" button. The Next Page button uses the primary blue. "Page X of Y" sits on the right.
- The question block. A bold header in the form "Question N (1 point)". The stem rendered with KaTeX. Then the answer area, which depends on the question type below.
- A repeat of the Previous Page and Next Page buttons and "Page X of Y" below the question, matching the screenshots.
- A thin horizontal divider.
- A "Submit Quiz" button in primary blue, with an italic counter to its right reading "N of M questions saved".

**Header for timed mode:**
- Replace the lockdown browser bar with a clean app header showing the product name, the exam name, an attempt label, and for timed mode a live countdown like "Time Left: 0:40:58". The timer counts down and auto submits at zero. Warn at five minutes and one minute remaining.

### Question types and their answer areas

1. **single_mcq.** A vertical list of radio options. When an option is selected, the entire row gets a full width light grey highlight bar, matching the "cost savings" row in screenshot one. One selection allowed.
2. **multi_mcq.** Checkboxes instead of radios. Multiple selections allowed. Grading requires the full correct set.
3. **matching.** Match the pulldown layout in screenshots two and three. Left side lists items, each with a small numbered dropdown to its left. Right side shows a numbered legend, for example 1 Message, 2 Segment or Datagram, 3 Packet, 4 Frame, 5 Bit. The student picks a number for each left item from its dropdown.
4. **fill_blank.** A sentence with a visible blank, matching screenshot four where a blank precedes "can be downloaded onto a person's cell phone". Below it, radio options. For math fill in the blank, allow a typed numeric or expression answer with a KaTeX preview, graded by value or accepted expression with tolerance.
5. **numeric.** A single input for a number or simple expression, with an optional live KaTeX preview, graded against `numeric_answers` with tolerance and accepted equivalents.

### Behavior

- **Autosave.** Saving an answer updates `attempt_answers`, flips the rail indicator to a checkmark, and updates the "N of M questions saved" counter. A refresh restores the exact state from the server, because the attempt and its question set are fixed in `attempt_questions`.
- **Navigation.** Previous and Next move between questions. The rail jumps directly. State persists across navigation.
- **Submit.** Submitting grades the attempt on the server, writes `is_correct` and `points_awarded`, sets `submitted_at` and `score`, then routes to the attempt review page. Confirm before submitting if questions are unanswered.
- **Timed mode.** The countdown is authoritative on the server using `started_at` and `time_limit_seconds`, so a client clock change cannot extend time. Auto submit when the server side remaining time hits zero.
- **Practice mode.** Untimed. After a question is saved, reveal correctness and the explanation for that question, fetched from a server route so answers are not pre loaded into the browser.

---

## 14. Design system

The marketing pages and study area use the UDST brand feel. UDST describes its identity as a deep vivid blue that signals reliability and trust. The test runner chrome uses the quiz blue sampled from the screenshots so it feels identical to the real thing.

- **Colors.** Sample exact values from `/reference/screenshots/` for the test runner buttons and from udst.edu.qa for the marketing blue. Start from these and adjust to match:
  - Brand blue, marketing: a deep vivid blue near `#0A2C6B` to `#0B3D91`.
  - Quiz action blue, test runner buttons: a medium blue near `#0A5CAB` to `#006FBF`, matched to the screenshots.
  - Neutrals: near white page background, soft grey panels, dark slate text near `#1F2933`.
  - Success green, warning amber, error red for feedback states, used sparingly.
  - Define all colors as CSS variables and Tailwind tokens in one file.
- **Typography.** A clean sans serif such as Inter for the interface. Generous line height in question stems for readability. Math sized to sit naturally in the text line.
- **Spacing and layout.** Calm, generous spacing. A single accent color. Avoid gradient heavy hero sections, avoid stock looking abstract blobs, avoid three identical feature cards with generic icons. Show the real product instead, for example an actual question card and the real test interface.
- **Components.** Buttons, inputs, radio and checkbox rows, the question card, the rail item, the timer, the progress and analytics widgets, the lock badge for Pro content.
- **Responsiveness.** The marketing and study pages adapt to mobile. The test runner is desktop first, since the real exam is desktop, but it must remain usable on a tablet. On small screens the rail collapses into a compact question picker.
- **Accessibility.** Sufficient contrast, keyboard navigation through options and pages, focus states, labels on all inputs, and a screen reader friendly question structure.

The test must not look AI generated. It must look like a deliberate, focused study tool.

---

## 15. Backend endpoints

Implement these as Next.js server routes. All of them check the session, and entitlement where relevant.

- `POST /api/attempts` creates an attempt, fixes its question set into `attempt_questions`, enforces free caps for mocks and practice, returns the attempt with questions but without correct answers.
- `POST /api/attempts/[id]/answer` saves a single answer, returns the new saved count, and in practice mode returns correctness and explanation for that one question.
- `POST /api/attempts/[id]/submit` grades the whole attempt on the server and finalizes it.
- `GET /api/entitlements` returns the user's plan, remaining daily practice, and remaining weekly mocks.
- `POST /api/checkout` creates a provider checkout session for Pro.
- `POST /api/billing-portal` creates a provider portal session.
- `POST /api/webhooks/payments` verifies the signature and updates subscription state.
- `POST /api/questions/[id]/report` files a question report.

---

## 16. Security and anti abuse

The owner asked for no loopholes. Enforce all of the following.

- Row Level Security on every user data table, verified by tests that attempt cross user reads and expect denial.
- Correct answers are never sent to the client during an active attempt. Grading is server side. In practice mode, the answer for a single question is returned only after that question is saved.
- Entitlement is server side. A free user calling a Pro endpoint directly is rejected. Add a test that does exactly this and expects rejection.
- Webhook signature verification on the payments webhook. Reject unsigned or replayed events. Use the provider's idempotency or event id to avoid double processing.
- Price and plan are fixed on the server or by the provider. The client cannot choose a price.
- Rate limit auth attempts and the report route.
- Validate and sanitize all inputs. Reject malformed answer payloads.
- The service role key lives only in server environment variables and is never imported into client code. Confirm with a build check.
- Soft mitigation for free tier farming through many accounts: tie the daily cap to the verified account and accept that a determined user can make multiple accounts. Do not overbuild this.

---

## 17. SEO, performance, and analytics

- Server render the marketing pages with proper titles, meta descriptions, and Open Graph tags focused on UDST AMP preparation.
- Fast initial load. Lazy load KaTeX where possible. Avoid shipping the entire question bank to the client.
- Add privacy friendly product analytics for sign ups, upgrades, practice starts, and mock completions, so the owner can see what works. Do not add invasive tracking.

---

## 18. Testing and verification plan

Run all of this as part of the build. Do not consider the build done until it passes.

### Automated

- **Unit tests, Vitest.** Grading for every question type including matching and numeric tolerance. Entitlement logic for the daily cap, the weekly mock cap, and the Pro gate at period boundaries. The LaTeX sanitizer accepts valid and rejects invalid input.
- **Integration tests.** Sign up creates profile and subscription. Webhook upgrades and downgrades flip the plan. A free user hitting the cap is blocked.
- **End to end tests, Playwright.** Full journeys: sign up and verify, run a practice set and see feedback, hit the free daily cap, start the upgrade flow in the provider sandbox, take a timed mock, answer questions, refresh mid attempt and confirm state restored, let the timer reach zero and confirm auto submit, submit and review results, retry wrong questions as Pro.
- **Security tests.** A free user calling a Pro endpoint is rejected. A user reading another user's attempt is denied by RLS. A forged or replayed webhook is rejected. No correct answers appear in network responses during an active attempt.
- **Rendering smoke test.** A sample of questions across all types renders without KaTeX errors and matches the layout in the screenshots.

### Payment testing

Test payments only in the provider sandbox or test mode. Do not run real charges in automated tests. Verify the webhook updates the subscription using a test event.

### Manual acceptance checklist

A human runs through: home to sign up to first practice in under two minutes, the test runner visually matches the screenshots including the rail, the scrollbar, the highlighted selected option, the matching dropdowns, and the "N of M questions saved" counter, all math renders correctly with no raw LaTeX visible, the timer counts down and auto submits, the upgrade flow works in sandbox, and the not affiliated disclaimer is visible.

---

## 19. Build order and milestones

Work in this order. Verify each milestone's acceptance check before moving on. Record progress in `/Final_Outputs/build-log.md`.

1. **Foundation.** Next.js, TypeScript, Tailwind, tokens, Supabase project wiring, env handling. Acceptance: app boots, a styled placeholder home page renders, Supabase connects.
2. **Data model.** All migrations and RLS. Acceptance: tables exist, RLS denies cross user access in a test.
3. **Auth.** Sign up, sign in, reset, profile and subscription creation on first sign in. Acceptance: a new user lands on the dashboard with a free plan.
4. **Question pipeline.** Parse the PDF, generate, verify, build the admin review UI, seed a first batch of published AMP 1 questions across all topics. Acceptance: at least a few hundred published items exist across the 20 topics, all rendering cleanly.
5. **Practice runner.** Untimed practice with server side feedback and the daily cap. Acceptance: a free user practices, sees feedback, and is blocked at the cap.
6. **Test runner and mock.** The full quiz interface matching the screenshots, timed AMP 1 mock, autosave, refresh restore, server authoritative timer, submit and grade. Acceptance: the manual visual match passes and a full mock can be completed and reviewed.
7. **Payments and gating.** Lemon Squeezy checkout, webhook, plan sync, all Pro gates, billing portal. Acceptance: a sandbox upgrade flips the plan and unlocks Pro features, a lapse reverts to free.
8. **AMP 2 and analytics.** AMP 2 content and mock for Pro, topic analytics, weak area targeting, retry wrong questions. Acceptance: Pro features work end to end.
9. **Marketing pages and SEO.** Home, pricing, about, FAQ, disclaimer, meta tags. Acceptance: pages render, convert to sign up, and read like a real product.
10. **Hardening and tests.** All automated tests green, security tests green, performance acceptable. Acceptance: full Definition of Done met.

---

## 20. Manual setup checklist for the owner

These steps need a human and cannot be done by the build agent. Generate this as `/Final_Outputs/SETUP.md` as well, filled with the exact values and URLs the project uses.

1. **Supabase.** Create a project. Copy the project URL, the anon key, and the service role key into the environment. Run the migrations. Enable email auth and set the email templates.
2. **Payments, default Lemon Squeezy.** Create a Lemon Squeezy account and store. Create the Pro product and the monthly price, and the optional season pass. Copy the API key and the webhook signing secret. Set the webhook URL to the deployed `/api/webhooks/payments`. Switch to live mode only after sandbox testing.
   - **Alternative, Tap Payments.** If choosing the local route, register a Qatar business, open the merchant account, complete onboarding, then use the Tap keys and webhook secret with the `tap.ts` implementation.
3. **Environment variables.** Fill `.env` from `.env.example`. See Appendix D for the list.
4. **Upload the PDF.** Place the AMP 1 study guide in `/data/source/`.
5. **Generate and review.** Run the pipeline scripts, then open the admin review UI and publish a first batch, marking some items free.
6. **Deploy.** Connect the repo to Vercel, set the environment variables there, deploy. Point the custom domain.
7. **Smoke test live.** Sign up, practice, run a mock, do a sandbox upgrade, confirm the webhook updates the plan.

---

## 21. Definition of done

The build is complete only when all of the following are true.

- A visitor can go from the home page to their first practiced question in under two minutes.
- The test runner matches the screenshots: the page rail with saved indicators, the vertical scrollbar, the Previous and Next buttons in the right colors, the "Page X of Y" labels, the highlighted selected option, the matching dropdowns with a numbered legend, the fill in the blank layout, the "Submit Quiz" button, and the "N of M questions saved" counter.
- All mathematics renders correctly with KaTeX and no raw LaTeX is ever visible to a user.
- Free limits and Pro gating are enforced on the server and proven by tests.
- The timed mock uses a server authoritative countdown and auto submits at zero.
- Payments work in sandbox, the webhook syncs the plan, and a lapse reverts to free.
- Every published question has passed verification, so answers are correct and exactly one correct option exists where required.
- The platform shows the not affiliated disclaimer and does not use the UDST logo or claim official status.
- All automated tests pass, including the security tests for cross user access, Pro endpoint access by a free user, and webhook forgery.
- No dashes as connectors, no emojis, and no AI filler appear in any user facing copy.

---

## Appendix A. agents.md template

```
# agents.md

## Project
UDST AMP practice platform. Read UDST_AMP_PRACTICE_BUILD_SPEC.md fully before any work.

## Conventions
- Read this file first every session.
- Tasks are numbered. Produce, show, then save to the stated path.
- Agent notes go to /Final_Outputs/. Build log is /Final_Outputs/build-log.md.
- Do not update this file until a milestone is confirmed complete.

## Writing rules
- No dashes as sentence connectors. No emojis. No AI filler words.
- Plain active voice. Specific numbers over vague claims.

## Visual source of truth
- /reference/screenshots/ for the test runner. Match it exactly.

## Current milestone
- [keep this updated as milestones complete]
```

## Appendix B. Representative core migration

```sql
create type plan_t as enum ('free','pro');
create type sub_status_t as enum ('active','canceled','past_due','none');
create type q_type_t as enum ('single_mcq','multi_mcq','matching','fill_blank','numeric');
create type q_status_t as enum ('draft','reviewed','published');
create type difficulty_t as enum ('easy','medium','hard');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text not null default 'student',
  created_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  plan plan_t not null default 'free',
  status sub_status_t not null default 'none',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table exams (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  description text,
  duration_minutes int not null,
  total_questions int not null
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams on delete cascade,
  name text not null,
  slug text not null unique,
  order_index int not null,
  description text
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams on delete cascade,
  topic_id uuid not null references topics on delete cascade,
  type q_type_t not null,
  stem text not null,
  difficulty difficulty_t not null default 'medium',
  points numeric not null default 1,
  explanation text,
  source text not null default 'generated',
  status q_status_t not null default 'draft',
  is_free boolean not null default false,
  created_at timestamptz not null default now()
);

create table question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions on delete cascade,
  content text not null,
  is_correct boolean not null default false,
  order_index int not null
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  exam_id uuid not null references exams,
  mode text not null,
  topic_id uuid references topics,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  total numeric not null,
  time_limit_seconds int
);

create table attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts on delete cascade,
  question_id uuid not null references questions,
  order_index int not null
);

create table attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts on delete cascade,
  question_id uuid not null references questions,
  response jsonb,
  is_correct boolean,
  points_awarded numeric,
  saved_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table attempts enable row level security;
alter table attempt_questions enable row level security;
alter table attempt_answers enable row level security;

create policy own_profile on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy own_sub on subscriptions
  for select using (auth.uid() = user_id);
create policy own_attempts on attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Add the remaining tables, the matching and numeric answer tables, the question_reports table, and policies for attempt_questions and attempt_answers that check ownership through the parent attempt. Keep answer columns out of any client readable view during an active attempt.

## Appendix C. Starter generation prompt

```
You write original mathematics placement practice questions for high school level
(AMP 1) or precalculus level (AMP 2). You are given a topic, a difficulty, and a
question type. Produce one original item. Do not copy any existing question.

Return strict JSON only, no prose, with this shape:
{
  "type": "single_mcq | multi_mcq | matching | fill_blank | numeric",
  "stem": "question text, with math in LaTeX using $...$ or $$...$$",
  "options": [{"content": "...", "is_correct": true|false}],   // for choice types
  "numeric_answer": {"value": 0, "tolerance": 0, "accepted": ["..."]}, // numeric only
  "final_answer": "the answer stated plainly",
  "explanation_steps": ["step 1, math in LaTeX", "step 2", "..."],
  "distractor_rationales": {"option text or index": "why this option is wrong"},
  "concept_summary": "one line naming the rule or idea this tests",
  "difficulty": "easy | medium | hard"
}

Rules:
- Solvable with a basic scientific calculator. No tools beyond that.
- Exactly one correct option for single choice items.
- Distractors must reflect common student mistakes, not random values.
- All math in valid LaTeX that KaTeX can render. Use \frac, x^{2}, \sqrt{},
  \cdot, \sin, \log, 90^{\circ}. Never use raw carets, asterisks for
  multiplication, or -> for arrows.
- Keep wording plain. No dashes as connectors. No emojis.
```

The verification pass sends the stem and options to a separate solve prompt, compares the independent answer to the stated correct answer, and rejects mismatches.

## Appendix D. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server only, never in client code

PAYMENT_PROVIDER=lemonsqueezy        # or tap
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_PRO_VARIANT_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=

# Alternative local gateway, only if PAYMENT_PROVIDER=tap
TAP_SECRET_KEY=
TAP_WEBHOOK_SECRET=

APP_NAME=AMP Prep
APP_URL=
```

The deployed web application has no AI keys. The Gemini keys used to generate the question bank live only in the build scripts environment. See Appendix E.

---

## 22. Question generation system (offline, Gemini key rotator)

This section is authoritative for how the question bank is built. It supersedes any earlier mention of runtime AI. The website itself has no AI. Gemini is a build time tool only. Once the bank is generated and seeded, the generation scripts and the Gemini keys can be deleted and the live site is unaffected.

### Why Gemini

Gemini parses the PDF and generates questions and explanations. Use Gemini rather than the coding model for parsing and generation, because Gemini handles the PDF and the math content more reliably. The coding model still builds the website, the scripts, and the rotator.

### The key rotator

The owner provides ten Gemini API keys. Build a rotator so generation does not stop when one key hits its rate or daily limit.

- Implement `GeminiKeyRotator` in `/scripts/lib/gemini-rotator.ts`.
- Read the keys from the scripts environment as `GEMINI_API_KEYS`, a comma separated list, or as `GEMINI_API_KEY_1` through `GEMINI_API_KEY_10`.
- Round robin across keys for each request. Track per key requests in the current minute and in the current day.
- Stay under the per key ceiling proactively. As of mid 2026 the free tier ceilings are about 10 requests per minute and 250 requests per day for Gemini 2.5 Flash, and about 15 per minute and 1000 per day for Gemini 2.5 Flash-Lite. Treat these as configurable constants, not hard coded, because Google changes them.
- On a 429 or quota error, mark that key as cooling down with a timestamp, move to the next available key, and retry the request. Use exponential backoff per key.
- If every key is cooling down, sleep until the earliest key is free, then continue. This makes the effective throughput the sum across all ten keys, so generation continues until the whole bank is built.
- Log per key usage to `/Final_Outputs/generation-log.md` so the owner can see progress and remaining work.

### Models to use

- Generation: the current Gemini Flash model, default `gemini-2.5-flash`, with `gemini-2.5-flash-lite` as a higher volume fallback. Put the model id in one config constant.
- Verification solve: also a Flash model, run as a separate independent call. Note that Gemini Pro models left the free tier in April 2026, so do not assume free Pro access. If the owner adds a paid key, the verification step can be pointed at a stronger model by changing one constant.
- The free tier may use prompts to improve Google's products and allows commercial use outside the EU, EEA, UK, and Switzerland. The content here is original math questions with no personal data, so this is acceptable. Note it in the setup file so the owner is aware.

### PDF parsing with Gemini

`scripts/parse-pdf.ts` sends the uploaded PDF to Gemini and asks for a structured outline: the list of topics, the skills inside each topic, the observed difficulty spread, and the question styles and formats present. Write the outline to `/data/generated/topics.json`. Use this to model the bank. Do not store verbatim copyrighted questions for republication. The outline captures skills and difficulty, not the original wording.

### What to generate, in volume

Generate a large bank, then assemble fixed papers from it. Use the rotator so volume is not a constraint.

- A "paper" is a full length set. AMP 1 papers have 60 questions across the 20 topics in the same proportion and difficulty order as the real test. AMP 2 papers have 40 questions across the precalculus topics.
- Generate enough unique questions to assemble at least these targets. Treat the numbers as configurable goals.
  - AMP 1: at least 50 full papers worth of unique questions, which is about 3000 items. This supports 10 papers for free users and 40 or more for Pro, with room to grow.
  - AMP 2: at least 20 full papers worth of unique questions, which is about 800 items, all Pro.
  - Plus a per topic practice pool drawn from the same bank, so a student can drill any single topic.
- For each skill, generate multiple variants that differ in numbers, context, and phrasing, and across the supported question types: single choice, multiple choice, matching, fill in the blank, and numeric. The goal is variety, so a student who repeats a topic sees fresh problems, not the same item again.
- Deduplicate. Before accepting a generated item, normalize its stem and compare against existing items to reject near duplicates. A simple normalized text hash plus a similarity check is enough. Reject anything too close to an item already in the bank.

### Paper assembly

`scripts/assemble-papers.ts` selects published questions into named papers and stores the mapping. Free papers use only items marked `is_free = true`. Pro papers use the full published set. Each paper has a stable composition so a student can retake the same paper or pick a different one.

### Every question must teach

This is a study tool, so every single question carries a complete, clear explanation, not just an answer. For each item store and display:

- The final answer, stated plainly.
- A full worked solution as numbered steps, with all math in LaTeX so it renders cleanly with KaTeX.
- For multiple choice and matching items, a short reason for each wrong option, so a student who picked it understands the mistake. Store these as `distractor_rationales` keyed by option.
- A one line summary of the concept or rule the question tests, so a student can revise the idea quickly.

Add a `distractor_rationales` jsonb column to `questions`, or a sibling table, and a `concept_summary` text column. Show the full explanation in two places: immediately after a student answers in practice mode, and on the attempt review page after a mock. The explanation is identical quality for free and Pro users. The tiers differ in how many papers and how much practice they get, not in explanation depth.

### Pipeline order for generation

1. Parse the PDF with Gemini into the topic and skill outline.
2. Generate items per topic, per difficulty, per type, through the rotator, writing to `/data/generated/questions.json`.
3. Verify each item with an independent Gemini solve. Reject mismatches, items without exactly one correct option where required, items whose LaTeX fails to parse, and near duplicates.
4. Load the passing items into the database as `draft`, render them in the admin review UI, and publish the good ones, marking the free subset.
5. Assemble papers for AMP 1 and AMP 2.
6. Confirm the targets are met. If a topic is short on items, run more generation for that topic only.

When the bank meets the targets and is seeded, generation is complete. The scripts and the Gemini keys are no longer needed by the running website and can be removed.

## Appendix E. Scripts environment, generation only

These variables belong to the build scripts in `/scripts`, not to the deployed web app. Keep them in a separate `/scripts/.env` that is never deployed.

```
# Ten Gemini keys for the rotator, comma separated
GEMINI_API_KEYS=key1,key2,key3,key4,key5,key6,key7,key8,key9,key10

# Or provide them individually
# GEMINI_API_KEY_1=
# GEMINI_API_KEY_2=
# ... through 10

GEMINI_GENERATION_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
GEMINI_VERIFY_MODEL=gemini-2.5-flash

# Per key ceilings, configurable, update if Google changes them
GEMINI_RPM_PER_KEY=10
GEMINI_RPD_PER_KEY=250

# Generation targets
AMP1_TARGET_ITEMS=3000
AMP2_TARGET_ITEMS=800
AMP1_FREE_PAPERS=10
AMP1_PRO_PAPERS=40
AMP2_PRO_PAPERS=20

# Supabase service role, so scripts can seed the database
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

End of specification.
