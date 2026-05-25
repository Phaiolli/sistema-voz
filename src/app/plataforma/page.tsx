"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { VozWordmark } from "@/components/voz/wordmark";
import { Users, Calendar, TrendingUp, DollarSign, Clock, Zap, ArrowUpRight, LogOut } from "lucide-react";
import { toast } from "sonner";

interface Stats {
  users: { total: number; free: number; paid: number; newLast30d: number };
  events: { total: number; active: number; draft: number; ended: number };
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
  status: string;
  paidAt: string | null;
  createdAt: string;
}

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "+100%" : "—";
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

export default function PlataformaPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/plataforma/stats").then(r => r.json()),
      fetch("/api/v1/plataforma/payments").then(r => r.json()),
    ])
      .then(([s, p]) => {
        setStats(s as Stats);
        setRecentPayments(((p as { payments: Payment[] }).payments ?? []).slice(0, 8));
      })
      .catch(() => toast.error("Erro ao carregar dados da plataforma."))
      .finally(() => setLoading(false));
  }, []);

  const maxMonthly = Math.max(...(stats?.monthlyRevenue.map(m => m.amount) ?? [1]));

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <PlataformaHeader active="dashboard" />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--primary))", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 6px" }}>
            Plataforma VOZ
          </p>
          <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 28, margin: "0 0 4px" }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0 }}>
            {loading ? "Carregando…" : "Visão geral em tempo real da plataforma."}
          </p>
        </div>

        {/* KPI grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
          <KpiCard
            label="Usuários"
            value={loading ? "—" : String(stats?.users.total ?? 0)}
            sub={loading ? "" : `+${stats?.users.newLast30d ?? 0} nos últimos 30 dias`}
            icon={<Users size={18} />}
            color="hsl(var(--primary))"
          />
          <KpiCard
            label="Plano gratuito"
            value={loading ? "—" : String(stats?.users.free ?? 0)}
            sub={loading || !stats ? "" : `${stats.users.total > 0 ? Math.round((stats.users.free / stats.users.total) * 100) : 0}% do total`}
            icon={<Zap size={18} />}
            color="hsl(var(--muted-foreground))"
          />
          <KpiCard
            label="Pagantes"
            value={loading ? "—" : String(stats?.users.paid ?? 0)}
            sub={loading || !stats ? "" : `${stats.users.total > 0 ? Math.round((stats.users.paid / stats.users.total) * 100) : 0}% do total`}
            icon={<TrendingUp size={18} />}
            color="hsl(142 71% 45%)"
          />
          <KpiCard
            label="Receita total"
            value={loading ? "—" : brl(stats?.revenue.total ?? 0)}
            sub={loading || !stats ? "" : `${brl(stats.revenue.thisMonth)} este mês`}
            icon={<DollarSign size={18} />}
            color="hsl(var(--primary))"
            highlight
          />
          <KpiCard
            label="Receita este mês"
            value={loading ? "—" : brl(stats?.revenue.thisMonth ?? 0)}
            sub={loading || !stats ? "" : `${pctChange(stats.revenue.thisMonth, stats.revenue.lastMonth)} vs mês anterior`}
            icon={<DollarSign size={18} />}
            color="hsl(44 92% 54%)"
          />
          <KpiCard
            label="Eventos criados"
            value={loading ? "—" : String(stats?.events.total ?? 0)}
            sub={loading ? "" : `${stats?.events.active ?? 0} ao vivo · ${stats?.events.draft ?? 0} rascunho`}
            icon={<Calendar size={18} />}
            color="hsl(var(--primary))"
          />
          <KpiCard
            label="Pagamentos"
            value={loading ? "—" : String(stats?.payments.paid ?? 0)}
            sub={loading ? "" : `${stats?.payments.pending ?? 0} pendente${stats?.payments.pending !== 1 ? "s" : ""}`}
            icon={<Clock size={18} />}
            color="hsl(var(--muted-foreground))"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          {/* Monthly revenue chart */}
          <div style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 16, padding: 24 }}>
            <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 15, margin: "0 0 20px" }}>
              Receita mensal (últimos 6 meses)
            </p>
            {loading ? (
              <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Carregando…</p>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
                {stats?.monthlyRevenue.map(m => {
                  const h = maxMonthly > 0 ? Math.max(4, Math.round((m.amount / maxMonthly) * 100)) : 4;
                  return (
                    <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }}>
                        {m.amount > 0 ? brl(m.amount).replace("R$ ", "") : ""}
                      </span>
                      <div style={{ width: "100%", height: h, borderRadius: 4, background: m.amount > 0 ? "hsl(var(--primary))" : "hsl(var(--border))" }} />
                      <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>{m.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Users breakdown */}
          <div style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 16, padding: 24 }}>
            <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 15, margin: "0 0 20px" }}>
              Distribuição de usuários
            </p>
            {loading || !stats ? (
              <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Carregando…</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <UserBar label="Gratuito" count={stats.users.free} total={stats.users.total} color="hsl(var(--muted-foreground))" />
                <UserBar label="Pagante" count={stats.users.paid} total={stats.users.total} color="hsl(var(--primary))" />
                <div style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid hsl(var(--border))" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
                    <span>Taxa de conversão</span>
                    <span style={{ fontWeight: 600, color: "hsl(var(--foreground))" }}>
                      {stats.users.total > 0 ? ((stats.users.paid / stats.users.total) * 100).toFixed(1) : "0"}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent payments */}
        <div style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 15, margin: 0 }}>
              Pagamentos recentes
            </p>
            <Link href="/plataforma/financeiro" style={{ fontSize: 13, fontWeight: 500, color: "hsl(var(--primary))", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              Ver todos <ArrowUpRight size={13} />
            </Link>
          </div>

          {loading ? (
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Carregando…</p>
          ) : recentPayments.length === 0 ? (
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", textAlign: "center", padding: "24px 0" }}>
              Nenhum pagamento registrado ainda.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                    {["Usuário", "Evento", "Valor", "Status", "Data"].map(h => (
                      <th key={h} style={{ padding: "0 12px 12px 0", textAlign: "left", fontWeight: 600, color: "hsl(var(--muted-foreground))", fontSize: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                      <td style={{ padding: "12px 12px 12px 0" }}>
                        <p style={{ margin: 0, fontWeight: 500 }}>{p.ownerName}</p>
                        <p style={{ margin: 0, color: "hsl(var(--muted-foreground))", fontSize: 12 }}>{p.ownerEmail}</p>
                      </td>
                      <td style={{ padding: "12px 12px 12px 0", color: "hsl(var(--muted-foreground))" }}>{p.eventName}</td>
                      <td style={{ padding: "12px 12px 12px 0", fontWeight: 600 }}>{brl(p.amount)}</td>
                      <td style={{ padding: "12px 12px 12px 0" }}>
                        <StatusBadge status={p.status} />
                      </td>
                      <td style={{ padding: "12px 0 12px 0", color: "hsl(var(--muted-foreground))" }}>
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

/* ── Sub-components ──────────────────────────────────────────────── */

function KpiCard({ label, value, sub, icon, color, highlight }: {
  label: string; value: string; sub: string; icon: React.ReactNode; color: string; highlight?: boolean;
}) {
  return (
    <div style={{
      background: highlight ? "hsl(var(--primary) / .06)" : "hsl(var(--muted))",
      border: `1px solid ${highlight ? "hsl(var(--primary) / .25)" : "hsl(var(--border))"}`,
      borderRadius: 14, padding: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
        <span style={{ color, opacity: .7 }}>{icon}</span>
      </div>
      <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 26, margin: "0 0 4px", color: highlight ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}>
        {value}
      </p>
      <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0 }}>{sub}</p>
    </div>
  );
}

function UserBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{count} <span style={{ fontWeight: 400, color: "hsl(var(--muted-foreground))" }}>({pct.toFixed(0)}%)</span></span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "hsl(var(--border))", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
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

export function PlataformaHeader({ active }: { active: "dashboard" | "financeiro" | "usuarios" | "configuracoes" }) {
  const { data: session } = useSession();
  const user = session?.user as { name?: string; email?: string } | undefined;

  const initials = user?.name
    ? user.name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")
    : "?";

  const links: { href: string; label: string; key: typeof active }[] = [
    { href: "/plataforma", label: "Dashboard", key: "dashboard" },
    { href: "/plataforma/financeiro", label: "Financeiro", key: "financeiro" },
    { href: "/plataforma/usuarios", label: "Usuários", key: "usuarios" },
    { href: "/plataforma/configuracoes", label: "Configurações", key: "configuracoes" },
  ];

  return (
    <header style={{ height: 60, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, position: "sticky", top: 0, background: "hsl(var(--background))", zIndex: 40 }}>
      <VozWordmark size={20} />
      <span style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--primary))", textTransform: "uppercase", letterSpacing: ".1em", padding: "2px 8px", borderRadius: 4, background: "hsl(var(--primary) / .1)", flexShrink: 0 }}>
        Super Admin
      </span>

      <nav style={{ display: "flex", gap: 2, marginLeft: 4 }}>
        {links.map(l => (
          <Link key={l.key} href={l.href} style={{
            padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none",
            background: active === l.key ? "hsl(var(--muted))" : "transparent",
            color: active === l.key ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
          }}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* User identity */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "hsl(var(--primary))", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, flexShrink: 0, userSelect: "none",
          }}>
            {initials}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1 }}>
              {user?.name ?? "—"}
            </span>
            <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", lineHeight: 1 }}>
              {user?.email ?? ""}
            </span>
          </div>
        </div>

        <div style={{ width: 1, height: 28, background: "hsl(var(--border))" }} aria-hidden />

        <button
          onClick={() => signOut({ callbackUrl: "/entrar" })}
          title="Sair da plataforma"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            height: 34, padding: "0 12px", borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "transparent",
            color: "hsl(var(--muted-foreground))",
            fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <LogOut size={14} aria-hidden /> Sair
        </button>
      </div>
    </header>
  );
}
