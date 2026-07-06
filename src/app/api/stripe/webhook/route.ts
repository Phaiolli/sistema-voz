import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_APP } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase";
import { createEventSchema } from "@/lib/schemas";
import { toJson } from "@/lib/api/mappers";
import { logError } from "@/lib/log";
import {
  sendSubscriptionReceiptEmail,
  sendSubscriptionCanceledEmail,
  sendPaymentFailedEmail,
  sendEventPurchaseReceiptEmail,
} from "@/lib/email";
import { createHash } from "node:crypto";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

type ServerClient = SupabaseClient<Database>;

/**
 * Consolidated Stripe webhook (ADR-018). Handles both billing axes on one
 * endpoint: the per-event one-time payment (`plan_slug: "event"`) and the `pro`
 * monthly subscription lifecycle. Objects tagged for another app in the shared
 * Stripe account (`metadata.app !== "voz"`) are ignored.
 */

/**
 * Derives a deterministic UUID from a Stripe session id so webhook redeliveries
 * reuse the same event id, keeping the event upsert idempotent and collision-free
 * on the event's unique slug even if a prior attempt failed mid-way.
 */
function deterministicEventId(sessionId: string): string {
  const hex = createHash("sha256").update(sessionId).digest("hex");
  const version = "4" + hex.slice(13, 16);
  const variant =
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${version}-${variant}-${hex.slice(20, 32)}`;
}

function customerId(customer: string | { id: string } | null): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

/** Subscription period end lives on the item in this API version. */
function periodEndISO(sub: Stripe.Subscription): string | null {
  const end = sub.items?.data?.[0]?.current_period_end;
  return typeof end === "number" ? new Date(end * 1000).toISOString() : null;
}

/**
 * Best-effort lookup of an owner's contact for transactional e-mail, by user id
 * or Stripe customer id. Returns null when no e-mail is on file.
 */
async function fetchOwnerContact(
  supabase: ServerClient,
  column: "id" | "stripe_customer_id",
  value: string,
): Promise<{ email: string; name: string | null } | null> {
  const { data } = await supabase
    .from("users")
    .select("email, name")
    .eq(column, value)
    .maybeSingle();
  return data?.email ? { email: data.email, name: data.name } : null;
}

/**
 * Mirrors a subscription's state onto the owning user, matched by Stripe customer
 * id (persisted on `users.stripe_customer_id`). `subscription_status` in
 * `active`/`trialing` is what `isOwnerPro` treats as an active `pro` plan.
 */
async function applySubscription(
  supabase: ServerClient,
  sub: Stripe.Subscription,
): Promise<NextResponse> {
  const cust = customerId(sub.customer);
  if (!cust) return NextResponse.json({ received: true });

  const { error } = await supabase
    .from("users")
    .update({
      stripe_subscription_id: sub.id,
      subscription_status: sub.status,
      current_period_end: periodEndISO(sub),
    })
    .eq("stripe_customer_id", cust);

  if (error) {
    logError("stripe.webhook.subscription", error);
    return NextResponse.json(
      { error: "Falha ao atualizar assinatura." },
      { status: 500 },
    );
  }
  // Best-effort cancellation notice (customer.subscription.deleted → "canceled").
  if (sub.status === "canceled") {
    const owner = await fetchOwnerContact(supabase, "stripe_customer_id", cust);
    if (owner) await sendSubscriptionCanceledEmail(owner.email, owner.name);
  }
  return NextResponse.json({ received: true });
}

/** One-time per-event payment (ported from the legacy webhook, unchanged logic). */
async function handleEventCheckout(
  supabase: ServerClient,
  session: Stripe.Checkout.Session,
  eventId: string,
): Promise<NextResponse> {
  const { metadata } = session;
  if (!metadata?.ownerId || !metadata?.eventData) {
    logError(
      `stripe.webhook.metadata session=${session.id}`,
      "metadata incompleta",
    );
    return NextResponse.json(
      { error: "Metadata incompleta." },
      { status: 400 },
    );
  }

  const { data: existingPayment } = await supabase
    .from("event_payments")
    .select("id, status, event_id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  // Reapply plan="paid" before the idempotent early-return: a prior redelivery
  // may have marked the payment paid but failed to update the owner's plan.
  if (existingPayment?.status === "paid") {
    const { error: planErr } = await supabase
      .from("users")
      .update({ plan: "paid" })
      .eq("id", metadata.ownerId);
    if (planErr) {
      logError("stripe.webhook: reaplicar plano do owner", planErr);
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
      logError("stripe.webhook: eventData inválido", result.error);
      return NextResponse.json(
        { error: "Dados do evento inválidos." },
        { status: 422 },
      );
    }
    parsedEventData = result.data;
  } catch (err) {
    logError(`stripe.webhook.parse session=${session.id}`, err);
    return NextResponse.json(
      { error: "Falha ao processar dados do evento." },
      { status: 400 },
    );
  }

  // Reuse the event id from a prior (interrupted) attempt; otherwise derive it
  // deterministically so a redelivery converges instead of colliding on the slug.
  const resolvedEventId = existingPayment?.event_id ?? eventId;

  if (!existingPayment?.event_id) {
    const { error: insertErr } = await supabase.from("events").upsert(
      {
        id: resolvedEventId,
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
      logError("stripe.webhook: falha ao criar evento", insertErr);
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
      event_id: resolvedEventId,
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
    })
    .eq("stripe_session_id", session.id);

  if (updateErr) {
    logError("stripe.webhook: falha ao atualizar event_payments", updateErr);
    return NextResponse.json(
      { error: "Falha ao atualizar pagamento." },
      { status: 500 },
    );
  }

  const { error: planErr } = await supabase
    .from("users")
    .update({ plan: "paid" })
    .eq("id", metadata.ownerId);
  if (planErr) {
    logError("stripe.webhook: falha ao atualizar plano do owner", planErr);
    return NextResponse.json(
      { error: "Falha ao atualizar plano do owner." },
      { status: 500 },
    );
  }

  // Best-effort receipt for the one-time event purchase.
  const owner = await fetchOwnerContact(supabase, "id", metadata.ownerId);
  if (owner)
    await sendEventPurchaseReceiptEmail(
      owner.email,
      owner.name,
      parsedEventData.name,
    );

  return NextResponse.json({ received: true });
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
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Shared Stripe account: skip objects explicitly tagged for another app.
  const obj = event.data.object as { metadata?: Record<string, string> | null };
  const app = obj.metadata?.app;
  if (app && app !== STRIPE_APP) {
    return NextResponse.json({ received: true });
  }

  const supabase = createServerClient() as ServerClient;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // Shared Stripe account: this endpoint receives every project's checkout
      // events. Finalize only voz's own one-time per-event purchases —
      // positively tagged `app="voz"`. `pro` subscriptions settle via the
      // subscription/invoice events; anything else (other apps) is acknowledged
      // and ignored so it never triggers a 400/retry on the endpoint.
      if (
        session.metadata?.app !== STRIPE_APP ||
        session.mode === "subscription" ||
        session.metadata?.plan_slug === "pro"
      ) {
        return NextResponse.json({ received: true });
      }
      return handleEventCheckout(
        supabase,
        session,
        deterministicEventId(session.id),
      );
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // `deleted` carries status "canceled", which downgrades the owner to free.
      return applySubscription(
        supabase,
        event.data.object as Stripe.Subscription,
      );
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const cust = customerId(invoice.customer);
      if (!cust) return NextResponse.json({ received: true });
      const status = event.type === "invoice.paid" ? "active" : "past_due";
      const periodEnd = invoice.lines?.data?.[0]?.period?.end;
      const { error } = await supabase
        .from("users")
        .update({
          subscription_status: status,
          ...(typeof periodEnd === "number"
            ? { current_period_end: new Date(periodEnd * 1000).toISOString() }
            : {}),
        })
        .eq("stripe_customer_id", cust);
      if (error) {
        logError("stripe.webhook.invoice", error);
        return NextResponse.json(
          { error: "Falha ao atualizar assinatura." },
          { status: 500 },
        );
      }
      // Best-effort transactional e-mail (never blocks the webhook): a receipt
      // on a successful charge, a dunning notice on a failed one.
      const owner = await fetchOwnerContact(
        supabase,
        "stripe_customer_id",
        cust,
      );
      if (owner) {
        if (event.type === "invoice.paid") {
          await sendSubscriptionReceiptEmail(owner.email, owner.name);
        } else {
          await sendPaymentFailedEmail(owner.email, owner.name);
        }
      }
      return NextResponse.json({ received: true });
    }

    default:
      return NextResponse.json({ received: true });
  }
}
