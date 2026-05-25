import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

async function requireSuperAdmin() {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (user.role !== "superadmin") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  return null;
}

export async function GET() {
  const deny = await requireSuperAdmin();
  if (deny) return deny;

  const supabase = createServerClient();

  const [
    { count: totalUsers },
    { count: freeUsers },
    { count: paidUsers },
    { count: superadminUsers },
    { count: newUsers30d },
    { count: totalEvents },
    { count: activeEvents },
    { count: draftEvents },
    { count: endedEvents },
    { count: pendingPayments },
    { data: paidPayments },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("plan", "free").neq("role", "superadmin"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("plan", "paid"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "superadmin"),
    supabase.from("users").select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "ended"),
    supabase.from("event_payments").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("event_payments").select("amount, paid_at").eq("status", "paid"),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const totalRevenue = paidPayments?.reduce((s, p) => s + p.amount, 0) ?? 0;
  const thisMonthRevenue = paidPayments?.filter(p => p.paid_at && p.paid_at >= startOfMonth).reduce((s, p) => s + p.amount, 0) ?? 0;
  const lastMonthRevenue = paidPayments?.filter(p => p.paid_at && p.paid_at >= startOfLastMonth && p.paid_at <= endOfLastMonth).reduce((s, p) => s + p.amount, 0) ?? 0;

  // Monthly breakdown — last 6 months
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
    });
  }
  const revenueByMonth: Record<string, number> = Object.fromEntries(months.map(m => [m.key, 0]));
  for (const p of paidPayments ?? []) {
    if (!p.paid_at) continue;
    const d = new Date(p.paid_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in revenueByMonth) revenueByMonth[key] += p.amount;
  }
  const monthlyRevenue = months.map(m => ({ month: m.key, label: m.label, amount: revenueByMonth[m.key] }));

  return NextResponse.json({
    users: {
      total: (totalUsers ?? 0) - (superadminUsers ?? 0),
      free: freeUsers ?? 0,
      paid: paidUsers ?? 0,
      newLast30d: newUsers30d ?? 0,
    },
    events: {
      total: totalEvents ?? 0,
      active: activeEvents ?? 0,
      draft: draftEvents ?? 0,
      ended: endedEvents ?? 0,
    },
    revenue: {
      total: totalRevenue,
      thisMonth: thisMonthRevenue,
      lastMonth: lastMonthRevenue,
    },
    payments: {
      total: (paidPayments?.length ?? 0) + (pendingPayments ?? 0),
      paid: paidPayments?.length ?? 0,
      pending: pendingPayments ?? 0,
    },
    monthlyRevenue,
  });
}
