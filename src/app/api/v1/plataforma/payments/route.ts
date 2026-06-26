import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

async function requireSuperAdmin() {
  const session = await auth();
  const user = session?.user;
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (user.role !== "superadmin") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  return null;
}

export async function GET() {
  const deny = await requireSuperAdmin();
  if (deny) return deny;

  const supabase = createServerClient();

  const { data: payments } = await supabase
    .from("event_payments")
    .select("id, owner_id, event_id, amount, currency, status, stripe_session_id, stripe_payment_intent_id, created_at, paid_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!payments?.length) {
    return NextResponse.json({ payments: [] });
  }

  const ownerIds = [...new Set(payments.map(p => p.owner_id))];
  const eventIds = [...new Set(payments.map(p => p.event_id).filter(Boolean))];

  const [{ data: owners }, { data: events }] = await Promise.all([
    supabase.from("users").select("id, name, email").in("id", ownerIds),
    eventIds.length
      ? supabase.from("events").select("id, name").in("id", eventIds as string[])
      : Promise.resolve({ data: [] }),
  ]);

  const ownerMap = Object.fromEntries((owners ?? []).map(u => [u.id, u]));
  const eventMap = Object.fromEntries((events ?? []).map(e => [e.id, e]));

  return NextResponse.json({
    payments: payments.map(p => ({
      id: p.id,
      ownerName: ownerMap[p.owner_id]?.name ?? "—",
      ownerEmail: ownerMap[p.owner_id]?.email ?? "—",
      eventName: p.event_id ? (eventMap[p.event_id]?.name ?? "Evento removido") : "—",
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      stripeSessionId: p.stripe_session_id,
      stripePaymentIntentId: p.stripe_payment_intent_id,
      createdAt: p.created_at,
      paidAt: p.paid_at,
    })),
  });
}
