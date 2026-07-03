import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; plan?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: sub } = await supabase
    .from("users")
    .select("subscription_status, current_period_end, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: payments } = await supabase
    .from("event_payments")
    .select("id, amount, currency, status, created_at, paid_at, event_data, event_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const paid = (payments ?? []).filter((p) => p.status === "paid");
  const totalSpent = paid.reduce((sum, p) => sum + (p.amount as number), 0);
  const isPro =
    sub?.subscription_status === "active" || sub?.subscription_status === "trialing";

  return NextResponse.json({
    plan: user.plan ?? "free",
    isPro,
    subscriptionStatus: sub?.subscription_status ?? null,
    currentPeriodEnd: sub?.current_period_end ?? null,
    hasStripeCustomer: Boolean(sub?.stripe_customer_id),
    totalEvents: paid.length,
    totalSpent,
    payments: (payments ?? []).map((p) => ({
      id: p.id as string,
      status: p.status as string,
      amount: p.amount as number,
      currency: p.currency as string,
      eventName: (p.event_data as { name?: string } | null)?.name ?? null,
      createdAt: p.created_at as string,
      paidAt: p.paid_at as string | null,
    })),
  });
}
