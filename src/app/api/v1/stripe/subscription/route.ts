import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe, STRIPE_APP, LOOKUP_KEYS, getPriceByLookupKey } from "@/lib/stripe";
import { ensureStripeCustomer } from "@/lib/api/stripe-customer";
import { logError } from "@/lib/log";

/**
 * Starts a Stripe Checkout session for the monthly `pro` subscription (ADR-018).
 *
 * Reuses (or creates) the user's Stripe customer, resolves the price via the
 * `voz_pro_monthly` lookup key, and tags both the session and the resulting
 * subscription with `metadata.app = "voz"` so the shared-account webhook can
 * attribute them. Returns the hosted checkout URL.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
      { status: 401 },
    );
  }

  const user = session.user;
  if (user.role !== "owner" && user.role !== "admin" && user.role !== "superadmin") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Acesso restrito a owners e administradores." } },
      { status: 403 },
    );
  }

  try {
    const customerId = await ensureStripeCustomer(user.id);
    const price = await getPriceByLookupKey(LOOKUP_KEYS.pro);
    const meta = { app: STRIPE_APP, plan_slug: "pro", user_id: user.id };

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/planos`,
      metadata: meta,
      subscription_data: { metadata: meta },
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (err) {
    logError("stripe.subscription.checkout", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Falha ao iniciar a assinatura." } },
      { status: 500 },
    );
  }
}
