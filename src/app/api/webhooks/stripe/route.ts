import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase";
import { createEventSchema } from "@/lib/schemas";
import { toJson } from "@/lib/api/mappers";
import { logError } from "@/lib/log";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid signature." },
      { status: 400 },
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const checkoutSession = event.data.object as Stripe.Checkout.Session;
  const { metadata } = checkoutSession;

  if (!metadata?.ownerId || !metadata?.eventData) {
    logError(`stripe.webhook.metadata event=${event.id}`, "metadata incompleta");
    return NextResponse.json(
      { error: "Metadata incompleta." },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Idempotency check: skip if already paid
  const { data: existingPayment } = await supabase
    .from("event_payments")
    .select("id, status")
    .eq("stripe_session_id", checkoutSession.id)
    .maybeSingle();

  if (existingPayment?.status === "paid") {
    return NextResponse.json({ received: true });
  }

  let parsedEventData: ReturnType<typeof createEventSchema.parse>;

  try {
    const raw: unknown = JSON.parse(metadata.eventData);
    const result = createEventSchema.safeParse(raw);
    if (!result.success) {
      logError("Stripe webhook: eventData inválido", result.error);
      return NextResponse.json(
        { error: "Dados do evento inválidos." },
        { status: 422 },
      );
    }
    parsedEventData = result.data;
  } catch (err) {
    logError(`stripe.webhook.parse event=${event.id}`, err);
    return NextResponse.json(
      { error: "Falha ao processar dados do evento." },
      { status: 400 },
    );
  }

  const eventId = crypto.randomUUID();

  const { error: insertErr } = await supabase.from("events").insert({
    id: eventId,
    slug: parsedEventData.slug,
    name: parsedEventData.name,
    starts_at: parsedEventData.startsAt,
    ends_at: parsedEventData.endsAt,
    place: parsedEventData.place,
    address: parsedEventData.address,
    status: parsedEventData.status,
    about: parsedEventData.about,
    theme: toJson(parsedEventData.theme),
    config: toJson(parsedEventData.config),
    organizer_id: metadata.ownerId,
  });

  if (insertErr) {
    logError("Stripe webhook: falha ao criar evento", insertErr);
    return NextResponse.json(
      { error: "Falha ao criar evento." },
      { status: 500 },
    );
  }

  const { error: updateErr } = await supabase
    .from("event_payments")
    .update({
      status: "paid",
      event_id: eventId,
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id:
        typeof checkoutSession.payment_intent === "string"
          ? checkoutSession.payment_intent
          : (checkoutSession.payment_intent?.id ?? null),
    })
    .eq("stripe_session_id", checkoutSession.id);

  if (updateErr) {
    logError("Stripe webhook: falha ao atualizar event_payments", updateErr);
  }

  return NextResponse.json({ received: true });
}
