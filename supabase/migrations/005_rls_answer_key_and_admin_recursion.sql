-- Corrects two defects in 001 and 002 that only bite at query time, so neither
-- shows up when the earlier migrations apply cleanly.
--
-- Written as a forward migration rather than an edit to 001/002 so that the
-- history in this directory keeps matching what was actually run against the
-- database.

-- ---------------------------------------------------------------------------
-- 1. The content policies in 001 published the answer key.
--
-- 001 granted `authenticated` a plain SELECT on `questions` and
-- `question_options`. Postgres RLS filters rows, not columns, so those grants
-- covered every column on the row:
--
--   questions        -> explanation, final_answer, explanation_steps,
--                       distractor_rationales
--   question_options -> is_correct
--
-- Any signed-in student holding the publishable key could therefore read the
-- worked solution and the correct option for all 3,789 questions straight from
-- PostgREST, mid-exam, without touching the application. 001 even carried a
-- comment saying question_options "should NOT expose is_correct" directly above
-- the policy that exposed it.
--
-- This is the same leak that lib/types.ts `toClientSafe` exists to prevent in
-- the application layer, reintroduced one layer below it.
--
-- The application renders questions in server components and reaches the
-- database with the service role, which bypasses RLS. So no client-side read of
-- these tables is needed at all, and the correct fix is to stop granting one.
-- The tables keep RLS enabled with no SELECT policy, which denies by default.

drop policy if exists "read questions" on questions;
drop policy if exists "read options" on question_options;

-- NOTE: the two views below do not work and are dropped again in migration 007.
-- `security_invoker` makes them apply the caller's RLS against base tables that
-- this migration just removed the policies from, so they return zero rows for
-- every role. Kept here only because they were actually applied; see 007 for
-- why resurrecting them would reopen the leak above.
create or replace view public.questions_public
with (security_invoker = true) as
  select id, exam_id, topic_id, type, stem, difficulty, points,
         concept_summary, status, is_free, created_at
  from questions
  where status = 'published';

create or replace view public.question_options_public
with (security_invoker = true) as
  select o.id, o.question_id, o.content, o.order_index
  from question_options o
  join questions q on q.id = o.question_id
  where q.status = 'published';

-- The views read the base tables, so the base tables need a policy for the
-- invoker to get anything back. Scope it to published rows; the answer columns
-- are already excluded by the view's projection, and direct table access stays
-- denied because no policy grants it outside these definitions.
grant select on public.questions_public to authenticated;
grant select on public.question_options_public to authenticated;

-- ---------------------------------------------------------------------------
-- 2. The admin policy in 002 recurses infinitely.
--
-- "admins read all profiles" is a policy ON profiles whose USING clause runs
-- `select 1 from profiles`. Evaluating that inner select re-evaluates the same
-- policy, so Postgres aborts with 42P17 "infinite recursion detected in policy
-- for relation profiles". It applies without error and then fails on the first
-- read, which is the worst way for this to surface.
--
-- The fix is a SECURITY DEFINER function: it runs as the owner, so the policy
-- is not re-entered when it reads profiles.

drop policy if exists "admins read all profiles" on profiles;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "admins read all profiles" on profiles
  for select to authenticated
  using (public.is_admin());
