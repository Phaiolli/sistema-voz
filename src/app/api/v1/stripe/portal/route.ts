import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase";
import { logError } from "@/lib/log";

/**
 * Creates a Stripe Billing Portal session so the user can manage or cancel their
 * `pro` subscription (ADR-018). Cancellation flows back as
 * `customer.subscription.deleted`, which downgrades the user to free.
 *
 * @returns `{ url }` to redirect to, `409` when the user has no Stripe customer.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
      { status: 401 },
    );
  }

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!user?.stripe_customer_id) {
    return NextResponse.json(
      { error: { code: "NO_CUSTOMER", message: "Nenhuma assinatura encontrada." } },
      { status: 409 },
    );
  }

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url:
        process.env.STRIPE_PORTAL_RETURN_URL ?? `${process.env.NEXT_PUBLIC_APP_URL}/conta`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    logError("stripe.portal", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Falha ao abrir o portal de cobrança." } },
      { status: 500 },
    );
  }
}
