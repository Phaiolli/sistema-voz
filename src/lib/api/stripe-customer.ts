import { stripe, STRIPE_APP } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase";

/**
 * Returns the user's Stripe customer id, creating the customer on first use.
 *
 * The customer is tagged with `metadata.app = "voz"` to isolate it in the shared
 * Stripe account (ADR-018) and its id is persisted on `users.stripe_customer_id`
 * so subscriptions and the billing portal reuse the same customer.
 *
 * @throws when the user row does not exist.
 */
export async function ensureStripeCustomer(userId: string): Promise<string> {
  const supabase = createServerClient();
  const { data: user } = await supabase
    .from("users")
    .select("email, name, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (!user) throw new Error(`ensureStripeCustomer: user ${userId} not found`);
  if (user.stripe_customer_id) return user.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { app: STRIPE_APP, user_id: userId },
  });

  await supabase
    .from("users")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  return customer.id;
}
