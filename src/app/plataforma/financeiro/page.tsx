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
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <PlataformaHeader active="financeiro" />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 24, margin: "0 0 4px" }}>
            Financeiro
          </h1>
          <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0 }}>
            Receita e pagamentos da plataforma via Stripe.
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
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
        <div style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 16, padding: 24, marginBottom: 28 }}>
          <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 15, margin: "0 0 24px" }}>
            Receita mensal — últimos 6 meses
          </p>
          {loading ? (
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Carregando…</p>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140 }}>
              {stats?.monthlyRevenue.map(m => {
                const h = maxMonthly > 0 ? Math.max(6, Math.round((m.amount / maxMonthly) * 120)) : 6;
                return (
                  <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: m.amount > 0 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
                      {m.amount > 0 ? brl(m.amount) : "—"}
                    </span>
                    <div style={{ width: "100%", height: h, borderRadius: 6, background: m.amount > 0 ? "hsl(var(--primary))" : "hsl(var(--border))" }} />
                    <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textTransform: "capitalize" }}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payments table */}
        <div style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 15, margin: 0 }}>
              Todos os pagamentos ({filtered.length})
            </p>
            <div style={{ display: "flex", gap: 6 }}>
              {(["all", "paid", "pending"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid hsl(var(--border))",
                  background: filter === f ? "hsl(var(--primary))" : "hsl(var(--background))",
                  color: filter === f ? "#fff" : "hsl(var(--muted-foreground))",
                  fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                }}>
                  {{ all: "Todos", paid: "Pagos", pending: "Pendentes" }[f]}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Carregando…</p>
          ) : filtered.length === 0 ? (
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", textAlign: "center", padding: "32px 0" }}>
              Nenhum pagamento encontrado.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                    {["Usuário", "Evento", "Valor", "Status", "Stripe", "Data"].map(h => (
                      <th key={h} style={{ padding: "0 12px 12px 0", textAlign: "left", fontWeight: 600, color: "hsl(var(--muted-foreground))", fontSize: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                      <td style={{ padding: "12px 12px 12px 0" }}>
                        <p style={{ margin: 0, fontWeight: 500 }}>{p.ownerName}</p>
                        <p style={{ margin: 0, color: "hsl(var(--muted-foreground))", fontSize: 12 }}>{p.ownerEmail}</p>
                      </td>
                      <td style={{ padding: "12px 12px 12px 0", color: "hsl(var(--muted-foreground))", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.eventName}</td>
                      <td style={{ padding: "12px 12px 12px 0", fontWeight: 700 }}>{brl(p.amount)}</td>
                      <td style={{ padding: "12px 12px 12px 0" }}>
                        <StatusBadge status={p.status} />
                      </td>
                      <td style={{ padding: "12px 12px 12px 0" }}>
                        {p.stripePaymentIntentId ? (
                          <a
                            href={`https://dashboard.stripe.com/payments/${p.stripePaymentIntentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "hsl(var(--primary))", textDecoration: "none", fontSize: 12 }}
                          >
                            {p.stripePaymentIntentId.slice(0, 14)}… <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span style={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 0 12px 0", color: "hsl(var(--muted-foreground))", fontSize: 12, whiteSpace: "nowrap" }}>
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
    <div style={{ background: accent ? "hsl(38 92% 54% / .08)" : "hsl(var(--background))", border: `1px solid ${accent ? "hsl(38 92% 54% / .3)" : "hsl(var(--border))"}`, borderRadius: 12, padding: "16px 20px" }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 8px" }}>{label}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22 }}>{value}</span>
        {badge && (
          <span style={{ fontSize: 12, fontWeight: 600, color: badgePositive ? "hsl(142 71% 36%)" : "hsl(0 72% 51%)" }}>
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
    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}
