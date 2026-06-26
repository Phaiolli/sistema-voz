-- Billing is per-event: each event carries its own paid flag instead of relying
-- on the owner's plan. See ADR 015 (billing per-evento is_paid).
ALTER TABLE events ADD COLUMN is_paid boolean NOT NULL DEFAULT false;

-- Backfill: mark events that already have a paid payment as paid.
UPDATE events e
SET is_paid = true
FROM event_payments p
WHERE p.event_id = e.id AND p.status = 'paid';

-- Webhook idempotency depends on a single payment row per Stripe session. The
-- unique index prevents concurrent duplicate processing and makes the
-- maybeSingle() lookup in the webhook handler safe.
CREATE UNIQUE INDEX IF NOT EXISTS event_payments_stripe_session_id_key
  ON event_payments (stripe_session_id);
