import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase";
import { createEventSchema } from "@/lib/schemas";
import { toJson } from "@/lib/api/mappers";
import { logError } from "@/lib/log";
import { createHash } from "node:crypto";
import type Stripe from "stripe";

/**
 * Derives a deterministic UUID from a Stripe session id.
 *
 * Using a stable id keyed on the session means webhook redeliveries reuse the
 * same event id, so the event upsert (onConflict: "id") stays idempotent and
 * never collides on the event's unique slug, even if a prior attempt failed
 * after the event was created but before event_payments recorded the event_id.
 */
function deterministicEventId(sessionId: string): string {
  const hex = createHash("sha256").update(sessionId).digest("hex");
  // Shape the first 32 hex chars as a v4-style UUID (set version/variant nibbles).
  const version = "4" + hex.slice(13, 16);
  const variant =
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${version}-${variant}-${hex.slice(20, 32)}`;
}

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
    .select("id, status, event_id")
    .eq("stripe_session_id", checkoutSession.id)
    .maybeSingle();

  // Reapply plan="paid" before the idempotent early-return: a prior redelivery
  // may have marked the payment paid but failed to update the owner's plan.
  // Setting it again is harmless.
  if (existingPayment?.status === "paid") {
    const { error: planErr } = await supabase
      .from("users")
      .update({ plan: "paid" })
      .eq("id", metadata.ownerId);
    if (planErr) {
      logError("Stripe webhook: falha ao reaplicar plano do owner", planErr);
      return NextResponse.json(
        { error: "Falha ao atualizar plano do owner." },
        { status: 500 },
      );
    }
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

  // Reuse the event id from a prior (interrupted) attempt to stay idempotent;
  // otherwise derive it deterministically from the Stripe session so a redelivery
  // converges on the same id instead of minting a fresh one (which would collide
  // on the event's unique slug and poison the message).
  const eventId =
    existingPayment?.event_id ?? deterministicEventId(checkoutSession.id);

  // Only create the event if it was not already created by a prior attempt.
  if (!existingPayment?.event_id) {
    const { error: insertErr } = await supabase.from("events").upsert(
      {
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
        is_paid: true,
      },
      { onConflict: "id" },
    );

    if (insertErr) {
      logError("Stripe webhook: falha ao criar evento", insertErr);
      return NextResponse.json(
        { error: "Falha ao criar evento." },
        { status: 500 },
      );
    }
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
    // Return 500 so Stripe retries the webhook; the steps above are idempotent.
    logError("Stripe webhook: falha ao atualizar event_payments", updateErr);
    return NextResponse.json(
      { error: "Falha ao atualizar pagamento." },
      { status: 500 },
    );
  }

  // Mark the owner as a paying customer (used for badges/stats).
  const { error: planErr } = await supabase
    .from("users")
    .update({ plan: "paid" })
    .eq("id", metadata.ownerId);

  if (planErr) {
    logError("Stripe webhook: falha ao atualizar plano do owner", planErr);
    return NextResponse.json(
      { error: "Falha ao atualizar plano do owner." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
