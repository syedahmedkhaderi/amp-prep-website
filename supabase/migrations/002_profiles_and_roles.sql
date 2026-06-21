-- Aligns the production schema with the application's user model and automates
-- profile creation. Run after 001_initial_schema.sql.
--
-- The app reads a user's plan and role from one place. In production these live
-- on the profiles table, which is keyed to Supabase Auth's auth.users.

-- Plan and role on the profile so the app has a single source of truth.
alter table profiles add column if not exists plan plan_t not null default 'free';
alter table profiles add column if not exists email text;

-- Create a profile (and an idle subscription row) automatically whenever a new
-- auth user signs up, copying the full name from the signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, plan)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'student',
    'free'
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'none')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh on subscription changes.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_touch on subscriptions;
create trigger subscriptions_touch
  before update on subscriptions
  for each row execute function public.touch_updated_at();

-- Admins can read every profile (used by the admin grant tooling). A user is an
-- admin when their own profile row has role = 'admin'.
create policy "admins read all profiles" on profiles
  for select to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
