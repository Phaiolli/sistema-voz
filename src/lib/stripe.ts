/**
 * Stripe API client and constants.
 *
 * Initializes the Stripe SDK with the secret key (`STRIPE_SECRET_KEY`).
 * All payment operations use this singleton instance.
 *
 * @throws When `STRIPE_SECRET_KEY` is not set (fail-fast)
 */
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não configurada.");
}

/**
 * Stripe API client singleton.
 * Use for creating checkout sessions, handling webhooks, etc.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
});

/** Price of a single paid event in BRL cents (R$ 59,90). Display/fallback only. */
export const STRIPE_EVENT_PRICE_CENTS = 5990;

/** Currency code for all Stripe transactions. */
export const STRIPE_CURRENCY = "brl";

/**
 * Tags every object the app creates (customer, checkout session, subscription)
 * as belonging to Voz. The Stripe account is shared across projects, so
 * `metadata.app === "voz"` is the only way to isolate Voz data — the webhook
 * ignores anything else. See ADR-018.
 */
export const STRIPE_APP = "voz";

/**
 * Stripe price lookup keys. Prices are referenced by lookup key, never by
 * hardcoded `price_`/`prod_` IDs, so repricing happens in the dashboard without
 * a deploy. The products/prices already exist and are not created by the code.
 */
export const LOOKUP_KEYS = {
  event: "voz_event",
  pro: "voz_pro_monthly",
} as const;

/** Plan slugs that go through Stripe checkout (`free` never does). */
export type PaidPlanSlug = "event" | "pro";

/**
 * Resolves the active Stripe Price for a lookup key.
 *
 * @throws when no active price matches the key (misconfiguration).
 */
export async function getPriceByLookupKey(lookupKey: string): Promise<Stripe.Price> {
  const { data } = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  if (!data.length) {
    throw new Error(`Stripe price not found for lookup_key: ${lookupKey}`);
  }
  return data[0];
}
