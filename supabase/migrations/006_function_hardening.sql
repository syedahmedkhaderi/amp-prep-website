-- Closes two findings from the Supabase security advisor after 001-005.

-- 1. handle_new_user() is a trigger function on auth.users, but 002 left it
--    executable by `anon` and `authenticated`, so it was reachable as an RPC at
--    /rest/v1/rpc/handle_new_user. It is SECURITY DEFINER, which means a caller
--    would run it with the owner's privileges. Nothing should call it directly;
--    the trigger invokes it regardless of these grants.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 2. touch_updated_at() had a mutable search_path. A SECURITY DEFINER function
--    without a pinned search_path can be redirected to attacker-controlled
--    objects; this one is only SECURITY INVOKER, so the risk is lower, but
--    pinning it costs nothing and clears the advisor.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- public.is_admin() is deliberately left executable by `authenticated`: the RLS
-- policy on profiles calls it as the invoker, so revoking that grant would
-- break the policy. It takes no arguments and reads only auth.uid(), so a
-- caller can learn whether they themselves are an admin and nothing else.
