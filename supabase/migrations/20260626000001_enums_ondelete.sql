-- Lote 4 (Arquitetura): user_plan enum + ON DELETE policies on FKs.
-- Audit 2026-06-25. See ADR 008 (data model) and ADR 012 (Drizzle vs Supabase).
--
-- Written by hand (not drizzle-kit generate): the local drizzle snapshot is out
-- of sync with the deployed DB (Lote 1 used hand-written supabase migrations),
-- so `drizzle-kit generate` produced a destructive diff (it tried to re-CREATE
-- already-existing objects and re-ADD the `plan` column, dropping data). This
-- migration is idempotent (IF EXISTS / IF NOT EXISTS) and reversible (see the
-- rollback notes at the bottom).

-- ---------------------------------------------------------------------------
-- 1) user_plan enum + convert users.plan text -> user_plan
-- ---------------------------------------------------------------------------
-- The column already exists as TEXT DEFAULT 'free'. We must drop the text
-- default before the type change (a 'free'::text default is not assignable to
-- the enum directly), cast existing rows with USING, then restore the default.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_plan') THEN
    CREATE TYPE user_plan AS ENUM ('free', 'paid');
  END IF;
END $$;

ALTER TABLE users ALTER COLUMN plan DROP DEFAULT;
-- Backfill any NULL/unknown plan before the type change so SET NOT NULL cannot
-- fail on legacy rows. Values outside {free,paid} are normalised to 'free'.
UPDATE users SET plan = 'free' WHERE plan IS NULL OR plan NOT IN ('free', 'paid');
ALTER TABLE users ALTER COLUMN plan TYPE user_plan USING plan::user_plan;
ALTER TABLE users ALTER COLUMN plan SET DEFAULT 'free';
ALTER TABLE users ALTER COLUMN plan SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) ON DELETE policies on foreign keys
-- ---------------------------------------------------------------------------
-- LGPD minimisation: deleting an event removes its dependent personal data
-- (questions / registrations / participants / mediator assignments) -> CASCADE.
-- Financial history (event_payments) is preserved -> SET NULL on the nullable
-- event_id. Deleting a user removes the events they organise and their payment
-- rows and mediator assignments -> CASCADE.

-- questions.event_id -> events.id  (CASCADE)
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_event_id_events_id_fk;
ALTER TABLE questions
  ADD CONSTRAINT questions_event_id_events_id_fk
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- registrations.event_id -> events.id  (CASCADE)
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_event_id_events_id_fk;
ALTER TABLE registrations
  ADD CONSTRAINT registrations_event_id_events_id_fk
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- participants.event_id -> events.id  (CASCADE)
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_event_id_events_id_fk;
ALTER TABLE participants
  ADD CONSTRAINT participants_event_id_events_id_fk
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- mediator_assignments.event_id -> events.id  (CASCADE)
ALTER TABLE mediator_assignments DROP CONSTRAINT IF EXISTS mediator_assignments_event_id_events_id_fk;
ALTER TABLE mediator_assignments
  ADD CONSTRAINT mediator_assignments_event_id_events_id_fk
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- mediator_assignments.user_id -> users.id  (CASCADE)
ALTER TABLE mediator_assignments DROP CONSTRAINT IF EXISTS mediator_assignments_user_id_users_id_fk;
ALTER TABLE mediator_assignments
  ADD CONSTRAINT mediator_assignments_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- event_payments.event_id -> events.id  (SET NULL — keep financial history)
-- Created via inline REFERENCES in the SaaS migration, so the constraint may be
-- auto-named *_fkey; drop both possible names defensively.
ALTER TABLE event_payments DROP CONSTRAINT IF EXISTS event_payments_event_id_fkey;
ALTER TABLE event_payments DROP CONSTRAINT IF EXISTS event_payments_event_id_events_id_fk;
ALTER TABLE event_payments
  ADD CONSTRAINT event_payments_event_id_events_id_fk
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;

-- event_payments.owner_id -> users.id  (CASCADE)
ALTER TABLE event_payments DROP CONSTRAINT IF EXISTS event_payments_owner_id_fkey;
ALTER TABLE event_payments DROP CONSTRAINT IF EXISTS event_payments_owner_id_users_id_fk;
ALTER TABLE event_payments
  ADD CONSTRAINT event_payments_owner_id_users_id_fk
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

-- events.organizer_id -> users.id  (CASCADE)
-- No FK existed before. Production has at least one orphan row
-- (organizer_id='usr_ippaiquere' with no matching users row), so the FK is added
-- NOT VALID: it is enforced for every INSERT/UPDATE from now on, but existing
-- rows are not validated (avoids destroying/guessing legacy production data).
-- After the orphan(s) are fixed, finish enforcement with:
--   -- find orphans:
--   SELECT id, organizer_id FROM events e
--   WHERE organizer_id IS NOT NULL
--     AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = e.organizer_id);
--   -- then:
--   ALTER TABLE events VALIDATE CONSTRAINT events_organizer_id_users_id_fk;
-- CASCADE here means deleting a user removes their events and all dependent
-- personal data. User deletion must be a deliberate, audited admin action — the
-- routine LGPD owner-erasure path anonymises (lib/lgpd.ts), it does not hard-delete.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_organizer_id_users_id_fk;
ALTER TABLE events
  ADD CONSTRAINT events_organizer_id_users_id_fk
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

-- ---------------------------------------------------------------------------
-- Rollback (manual):
--   ALTER TABLE events DROP CONSTRAINT events_organizer_id_users_id_fk;
--   For each *_fk above: DROP then re-ADD without ON DELETE (no action).
--   ALTER TABLE users ALTER COLUMN plan DROP DEFAULT;
--   ALTER TABLE users ALTER COLUMN plan TYPE text USING plan::text;
--   ALTER TABLE users ALTER COLUMN plan SET DEFAULT 'free';
--   DROP TYPE user_plan;
-- ---------------------------------------------------------------------------
