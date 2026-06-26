"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { PlataformaHeader } from "../page";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

interface Stats {
  revenue: { total: number; thisMonth: number; lastMonth: number };
  payments: { total: number; paid: number; pending: number };
  monthlyRevenue: { month: string; label: string; amount: number }[];
}

interface Payment {
  id: string;
  ownerName: string;
  ownerEmail: string;
  eventName: string;
  amount: number;
  currency: string;
  status: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  paidAt: string | null;
  createdAt: string;
}

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "+∞" : "—";
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

export default function FinanceiroPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/plataforma/stats").then(r => r.json()),
      fetch("/api/v1/plataforma/payments").then(r => r.json()),
    ])
      .then(([s, p]) => {
        setStats(s as Stats);
        setPayments((p as { payments: Payment[] }).payments ?? []);
      })
      .catch(() => toast.error("Erro ao carregar dados financeiros."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = payments.filter(p => filter === "all" || p.status === filter);
  const maxMonthly = Math.max(...(stats?.monthlyRevenue.map(m => m.amount) ?? [1]));
  const avgTicket = stats && stats.payments.paid > 0
    ? stats.revenue.total / stats.payments.paid
    : 0;

  return (
    <div className="bg-background text-foreground" style={{ minHeight: "100dvh" }}>
      <PlataformaHeader active="financeiro" />

      <main className="mx-auto px-6 py-8" style={{ maxWidth: 1200 }}>
        <div className="mb-7">
          <h1 className="font-bold" style={{ fontFamily: '"Archivo", sans-serif', fontSize: 24, margin: "0 0 4px" }}>
            Financeiro
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 13, margin: 0 }}>
            Receita e pagamentos da plataforma via Stripe.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 mb-7" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <SummaryCard label="Receita total" value={loading ? "—" : brl(stats?.revenue.total ?? 0)} />
          <SummaryCard
            label="Este mês"
            value={loading ? "—" : brl(stats?.revenue.thisMonth ?? 0)}
            badge={loading || !stats ? undefined : pctChange(stats.revenue.thisMonth, stats.revenue.lastMonth)}
            badgePositive={(stats?.revenue.thisMonth ?? 0) >= (stats?.revenue.lastMonth ?? 0)}
          />
          <SummaryCard label="Mês anterior" value={loading ? "—" : brl(stats?.revenue.lastMonth ?? 0)} />
          <SummaryCard label="Ticket médio" value={loading ? "—" : brl(avgTicket)} />
          <SummaryCard label="Pagamentos confirmados" value={loading ? "—" : String(stats?.payments.paid ?? 0)} />
          <SummaryCard
            label="Pendentes"
            value={loading ? "—" : String(stats?.payments.pending ?? 0)}
            accent={(stats?.payments.pending ?? 0) > 0}
          />
        </div>

        {/* Monthly revenue chart */}
        <div className="bg-muted border border-border rounded-2xl p-6 mb-7">
          <p className="font-semibold" style={{ fontFamily: '"Archivo", sans-serif', fontSize: 15, margin: "0 0 24px" }}>
            Receita mensal — últimos 6 meses
          </p>
          {loading ? (
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>Carregando…</p>
          ) : (
            <div className="flex items-end gap-3" style={{ height: 140 }}>
              {stats?.monthlyRevenue.map(m => {
                const h = maxMonthly > 0 ? Math.max(6, Math.round((m.amount / maxMonthly) * 120)) : 6;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                    <span className="font-semibold" style={{ fontSize: 11, color: m.amount > 0 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
                      {m.amount > 0 ? brl(m.amount) : "—"}
                    </span>
                    <div className="w-full rounded-md" style={{ height: h, background: m.amount > 0 ? "hsl(var(--primary))" : "hsl(var(--border))" }} />
                    <span className="text-muted-foreground whitespace-nowrap capitalize" style={{ fontSize: 12 }}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payments table */}
        <div className="bg-muted border border-border rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <p className="font-semibold m-0" style={{ fontFamily: '"Archivo", sans-serif', fontSize: 15 }}>
              Todos os pagamentos ({filtered.length})
            </p>
            <div className="flex gap-1.5">
              {(["all", "paid", "pending"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`h-8 px-3 rounded-lg border border-border font-medium cursor-pointer ${filter === f ? "bg-primary" : "bg-background text-muted-foreground"}`}
                  style={{ fontSize: 13, fontFamily: "inherit", color: filter === f ? "#fff" : undefined }}
                >
                  {{ all: "Todos", paid: "Pagos", pending: "Pendentes" }[f]}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" style={{ fontSize: 13 }}>
              Nenhum pagamento encontrado.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr className="border-b border-border">
                    {["Usuário", "Evento", "Valor", "Status", "Stripe", "Data"].map(h => (
                      <th key={h} className="text-left font-semibold text-muted-foreground uppercase" style={{ padding: "0 12px 12px 0", fontSize: 12, letterSpacing: ".05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-border">
                      <td style={{ padding: "12px 12px 12px 0" }}>
                        <p className="m-0 font-medium">{p.ownerName}</p>
                        <p className="m-0 text-muted-foreground" style={{ fontSize: 12 }}>{p.ownerEmail}</p>
                      </td>
                      <td className="text-muted-foreground overflow-hidden whitespace-nowrap" style={{ padding: "12px 12px 12px 0", maxWidth: 160, textOverflow: "ellipsis" }}>{p.eventName}</td>
                      <td className="font-bold" style={{ padding: "12px 12px 12px 0" }}>{brl(p.amount)}</td>
                      <td style={{ padding: "12px 12px 12px 0" }}>
                        <StatusBadge status={p.status} />
                      </td>
                      <td style={{ padding: "12px 12px 12px 0" }}>
                        {p.stripePaymentIntentId ? (
                          <a
                            href={`https://dashboard.stripe.com/payments/${p.stripePaymentIntentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary no-underline"
                            style={{ fontSize: 12 }}
                          >
                            {p.stripePaymentIntentId.slice(0, 14)}… <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-muted-foreground" style={{ fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td className="text-muted-foreground whitespace-nowrap" style={{ padding: "12px 0 12px 0", fontSize: 12 }}>
                        {new Date(p.paidAt ?? p.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, badge, badgePositive, accent }: {
  label: string; value: string; badge?: string; badgePositive?: boolean; accent?: boolean;
}) {
  return (
    <div className="rounded-xl py-4 px-5 border" style={{ background: accent ? "hsl(38 92% 54% / .08)" : "hsl(var(--background))", borderColor: accent ? "hsl(38 92% 54% / .3)" : "hsl(var(--border))" }}>
      <p className="font-semibold text-muted-foreground uppercase" style={{ fontSize: 12, letterSpacing: ".06em", margin: "0 0 8px" }}>{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="font-bold" style={{ fontFamily: '"Archivo", sans-serif', fontSize: 22 }}>{value}</span>
        {badge && (
          <span className="font-semibold" style={{ fontSize: 12, color: badgePositive ? "hsl(142 71% 36%)" : "hsl(0 72% 51%)" }}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    paid: { label: "Pago", color: "hsl(142 71% 32%)", bg: "hsl(142 71% 45% / .12)" },
    pending: { label: "Pendente", color: "hsl(38 85% 40%)", bg: "hsl(var(--accent) / .12)" },
    refunded: { label: "Estornado", color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className="py-1 px-2.5 rounded-full font-semibold" style={{ fontSize: 12, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}
