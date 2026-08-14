-- Session invalidation support.
--
-- token_version is embedded in each session token. Bumping it makes every
-- token minted earlier fail validation, which is what allows a password change
-- to sign out other devices. Without it a stolen seven-day session survives a
-- password change for the rest of its life.
--
-- Mirrors the equivalent column migration in lib/db/sqlite.ts so the SQLite and
-- Postgres schemas do not drift.

alter table profiles add column if not exists token_version integer not null default 0;
