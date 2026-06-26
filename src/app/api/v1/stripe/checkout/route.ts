import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe, STRIPE_EVENT_PRICE_CENTS, STRIPE_CURRENCY } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase";
import { createEventSchema } from "@/lib/schemas";
import { toJson } from "@/lib/api/mappers";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
      { status: 401 },
    );
  }

  const user = session.user as { id: string; role?: string };
  if (user.role !== "owner" && user.role !== "admin") {
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

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: STRIPE_CURRENCY,
          product_data: { name: "voz. — Evento: " + eventData.name },
          unit_amount: STRIPE_EVENT_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pagamento/cancelado`,
    metadata: {
      ownerId: user.id,
      eventData: JSON.stringify(eventData),
    },
  });

  const supabase = createServerClient();
  const paymentId = crypto.randomUUID();

  await supabase.from("event_payments").insert({
    id: paymentId,
    stripe_session_id: checkoutSession.id,
    owner_id: user.id,
    event_data: toJson(eventData),
    amount: STRIPE_EVENT_PRICE_CENTS,
    status: "pending",
  });

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
