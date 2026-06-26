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

/** Price of a single paid event in BRL cents (R$ 59,90). */
export const STRIPE_EVENT_PRICE_CENTS = 5990;

/** Currency code for all Stripe transactions. */
export const STRIPE_CURRENCY = "brl";
