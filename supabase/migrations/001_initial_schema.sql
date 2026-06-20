-- Supabase / Postgres migration for the AMP Prep platform.
-- Mirrors the SQLite schema used in local development.
-- Spec Section 7 and Appendix B.

create type plan_t as enum ('free','pro');
create type sub_status_t as enum ('active','canceled','past_due','none');
create type q_type_t as enum ('single_mcq','multi_mcq','matching','fill_blank','numeric');
create type q_status_t as enum ('draft','reviewed','published');
create type difficulty_t as enum ('easy','medium','hard');

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text not null default 'student',
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
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

create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  duration_minutes int not null,
  total_questions int not null
);

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams on delete cascade,
  name text not null,
  slug text not null unique,
  order_index int not null,
  description text
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams on delete cascade,
  topic_id uuid not null references topics on delete cascade,
  type q_type_t not null,
  stem text not null,
  difficulty difficulty_t not null default 'medium',
  points numeric not null default 1,
  explanation text,
  final_answer text,
  explanation_steps jsonb,
  distractor_rationales jsonb,
  concept_summary text,
  source text not null default 'generated',
  status q_status_t not null default 'draft',
  is_free boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions on delete cascade,
  content text not null,
  is_correct boolean not null default false,
  order_index int not null
);

create table if not exists question_matches (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions on delete cascade,
  left_content text not null,
  correct_choice_index int not null,
  order_index int not null
);

create table if not exists question_match_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions on delete cascade,
  choice_text text not null,
  order_index int not null
);

create table if not exists numeric_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions on delete cascade,
  correct_value numeric not null,
  tolerance numeric not null default 0,
  accepted_expressions text[]
);

create table if not exists papers (
  id uuid primary key default gen_random_uuid(),
  exam_code text not null,
  name text not null,
  is_free boolean not null default false,
  order_index int not null
);

create table if not exists paper_questions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references papers on delete cascade,
  question_id uuid not null references questions,
  order_index int not null
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  exam_id uuid not null references exams,
  mode text not null,
  topic_id uuid references topics,
  paper_id uuid references papers,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  total numeric not null,
  time_limit_seconds int
);

create table if not exists attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts on delete cascade,
  question_id uuid not null references questions,
  order_index int not null
);

create table if not exists attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts on delete cascade,
  question_id uuid not null references questions,
  response jsonb,
  is_correct boolean,
  points_awarded numeric,
  saved_at timestamptz not null default now()
);

create table if not exists question_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  question_id uuid not null references questions,
  reason text,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table attempts enable row level security;
alter table attempt_questions enable row level security;
alter table attempt_answers enable row level security;
alter table question_reports enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own subscription" on subscriptions for select using (auth.uid() = user_id);
create policy "own attempts" on attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own attempt questions" on attempt_questions for all
  using (exists (select 1 from attempts where attempts.id = attempt_questions.attempt_id and attempts.user_id = auth.uid()))
  with check (exists (select 1 from attempts where attempts.id = attempt_questions.attempt_id and attempts.user_id = auth.uid()));
create policy "own attempt answers" on attempt_answers for all
  using (exists (select 1 from attempts where attempts.id = attempt_answers.attempt_id and attempts.user_id = auth.uid()))
  with check (exists (select 1 from attempts where attempts.id = attempt_answers.attempt_id and attempts.user_id = auth.uid()));
create policy "own reports" on question_reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public read for content tables (authenticated only)
alter table exams enable row level security;
alter table topics enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table question_matches enable row level security;
alter table question_match_choices enable row level security;
alter table numeric_answers enable row level security;

create policy "read exams" on exams for select to authenticated using (true);
create policy "read topics" on topics for select to authenticated using (true);
create policy "read questions" on questions for select to authenticated using (status = 'published');
-- Note: question_options should NOT expose is_correct during active attempts.
-- In practice, correct answers are served only through server routes using the service role key.
create policy "read options" on question_options for select to authenticated using (true);

-- Seed exams
insert into exams (code, title, description, duration_minutes, total_questions)
values ('AMP1', 'AMP 1: Academic Mathematics Placement', 'Basic high school mathematics. 60 questions across 20 topics.', 120, 60)
on conflict (code) do nothing;

insert into exams (code, title, description, duration_minutes, total_questions)
values ('AMP2', 'AMP 2: Advanced Mathematics Placement', 'Advanced algebra, functions, and precalculus. 40 questions in 90 minutes.', 90, 40)
on conflict (code) do nothing;
