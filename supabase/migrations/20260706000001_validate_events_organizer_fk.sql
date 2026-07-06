-- Close the NOT VALID FK on events.organizer_id (added in 20260626000001).
-- Production had an orphan seeded from fixtures (organizer_id='usr_ippaiquere'
-- with no matching users row). Reassign any orphan event to the admin
-- fab.zanardi@gmail.com (a real, login-capable owner), then validate the
-- constraint so future integrity is fully enforced.
--
-- Safety: the UPDATE...FROM only touches rows whose organizer_id has no matching
-- user AND only when the target admin exists (the join gates it). If the target
-- is missing, zero rows change and the VALIDATE below fails loudly rather than
-- nulling any owner. Idempotent: re-runs update 0 rows and re-validate is a no-op.
UPDATE events e
SET organizer_id = u.id
FROM users u
WHERE u.email = 'fab.zanardi@gmail.com'
  AND e.organizer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users x WHERE x.id = e.organizer_id);

ALTER TABLE events VALIDATE CONSTRAINT events_organizer_id_users_id_fk;

-- Rollback (manual): a validated constraint cannot be "un-validated"; drop and
-- re-add as NOT VALID if ever needed:
--   ALTER TABLE events DROP CONSTRAINT events_organizer_id_users_id_fk;
--   ALTER TABLE events ADD CONSTRAINT events_organizer_id_users_id_fk
--     FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
