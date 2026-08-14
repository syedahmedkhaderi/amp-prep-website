-- Password reset tokens, mirroring the SQLite table in lib/db/sqlite.ts so the
-- two schemas do not drift.
--
-- The token itself is never stored, only its SHA-256 hash: a leaked database
-- must not hand over a working reset link for every account. Same reasoning as
-- storing a bcrypt hash instead of a password.
--
-- RLS is enabled with no policy, which denies every client role. These rows are
-- only ever read and written by the server, which reaches the database with the
-- service role and bypasses RLS. A user has no reason to read their own reset
-- tokens, and anyone else reading them could take over the account.

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_reset_tokens_user on password_reset_tokens (user_id);
create index if not exists idx_reset_tokens_expiry on password_reset_tokens (expires_at);

alter table password_reset_tokens enable row level security;
