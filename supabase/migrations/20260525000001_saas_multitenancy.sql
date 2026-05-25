-- Migration: SaaS Multi-tenant — ADR 009
-- Adds 'owner' role, 'plan' column in users, and event_payments table

-- 1. Extend user_role enum with 'owner'
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';

-- 2. Add plan column to users (free or paid)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

-- 3. Create event_payments table for Stripe tracking
CREATE TABLE IF NOT EXISTS event_payments (
  id                        TEXT PRIMARY KEY,
  event_id                  TEXT REFERENCES events(id),
  owner_id                  TEXT NOT NULL REFERENCES users(id),
  stripe_session_id         TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id  TEXT,
  amount                    INTEGER NOT NULL,
  currency                  TEXT NOT NULL DEFAULT 'brl',
  status                    TEXT NOT NULL DEFAULT 'pending',
  event_data                JSONB,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at                   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS event_payments_owner_id_idx ON event_payments (owner_id);
