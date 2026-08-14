-- Removes the two views added in 005. They do not work, and left in place they
-- are worse than nothing.
--
-- 005 created questions_public / question_options_public with
-- `security_invoker = true`, which makes a view apply the *caller's* row level
-- security against the base tables. The same migration removed the only SELECT
-- policies on `questions` and `question_options`, so there is nothing for the
-- caller's RLS to grant: both views return zero rows for every role.
--
-- That is harmless while nothing reads them, but the comment in 005 described
-- them as available "for any future client-side read", so the likely next step
-- is someone wiring a client query to an empty view and repairing the empty
-- result by adding a SELECT policy to the base table — which restores exactly
-- the answer-key exposure 005 was written to remove.
--
-- Deleting them leaves one clear rule instead of a broken affordance: question
-- content is served by the application's server layer using the service role,
-- and no client role reads the question tables. If a genuine client-side read
-- is ever needed, it needs a deliberate design — a column-scoped grant, or a
-- SECURITY DEFINER function returning only the safe columns — not a view
-- resurrected from here.

drop view if exists public.questions_public;
drop view if exists public.question_options_public;
