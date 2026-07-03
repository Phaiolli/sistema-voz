-- Stripe `pro` subscription support (ADR-018). Per-event billing (events.is_paid
-- + event_payments) is unchanged; these columns track the recurring subscription
-- on the user. "É pro?" = subscription_status in ('active','trialing').
ALTER TABLE users ADD COLUMN stripe_customer_id text;
ALTER TABLE users ADD CONSTRAINT users_stripe_customer_id_key UNIQUE (stripe_customer_id);
ALTER TABLE users ADD COLUMN stripe_subscription_id text;
ALTER TABLE users ADD COLUMN subscription_status text;
ALTER TABLE users ADD COLUMN current_period_end timestamptz;
