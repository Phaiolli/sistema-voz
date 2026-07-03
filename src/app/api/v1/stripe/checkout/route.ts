import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe, STRIPE_EVENT_PRICE_CENTS, STRIPE_APP, LOOKUP_KEYS, getPriceByLookupKey } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase";
import { createEventSchema } from "@/lib/schemas";
import { toJson } from "@/lib/api/mappers";
import { logError } from "@/lib/log";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
      { status: 401 },
    );
  }

  const user = session.user as { id: string; role?: string };
  if (user.role !== "owner" && user.role !== "admin" && user.role !== "superadmin") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Acesso restrito a owners e administradores." } },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createEventSchema.safeParse(body?.eventData);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "Dados do evento inválidos.",
          details: parsed.error.flatten(),
        },
      },
      { status: 422 },
    );
  }

  const eventData = parsed.data;

  // Price comes from the `voz_event` lookup key (ADR-018), never a hardcoded id.
  const price = await getPriceByLookupKey(LOOKUP_KEYS.event);
  const amount = price.unit_amount ?? STRIPE_EVENT_PRICE_CENTS;

  const checkoutSession = await stripe.checkout.sessions.create({
    line_items: [{ price: price.id, quantity: 1 }],
    mode: "payment",
    allow_promotion_codes: true,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pagamento/cancelado`,
    // `app`/`plan_slug` isolate this object in the shared Stripe account; the
    // per-event flow keeps `ownerId`/`eventData` for the webhook.
    metadata: {
      app: STRIPE_APP,
      plan_slug: "event",
      user_id: user.id,
      ownerId: user.id,
      eventData: JSON.stringify(eventData),
    },
  });

  const supabase = createServerClient();
  const paymentId = crypto.randomUUID();

  const { error: insertErr } = await supabase.from("event_payments").insert({
    id: paymentId,
    stripe_session_id: checkoutSession.id,
    owner_id: user.id,
    event_data: toJson(eventData),
    amount,
    status: "pending",
  });

  if (insertErr) {
    logError("[stripe.checkout] falha ao registrar event_payments", insertErr);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Falha ao iniciar o pagamento." } },
      { status: 500 },
    );
  }

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
