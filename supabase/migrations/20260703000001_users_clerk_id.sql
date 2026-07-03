-- Auth migrated from NextAuth (Credentials + bcrypt) to Clerk. See ADR-017.
--
-- clerk_id maps the Clerk identity back to this row in the sync webhook. Unique,
-- but nullable during the migration window (Postgres allows multiple NULLs), so
-- existing rows stay valid until reconciled with Clerk.
ALTER TABLE users ADD COLUMN clerk_id text;
ALTER TABLE users ADD CONSTRAINT users_clerk_id_key UNIQUE (clerk_id);

-- Clerk owns the credential now: users created via Clerk have no local hash.
-- Kept for the bcrypt migration and legacy rows, but no longer required.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
