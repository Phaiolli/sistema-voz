"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useAppUser } from "@/lib/use-app-user";
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
    <div className="bg-background text-foreground" style={{ minHeight: "100dvh" }}>
      <PlataformaHeader active="dashboard" />

      <main className="mx-auto px-6 py-8" style={{ maxWidth: 1200 }}>
        <div className="mb-8">
          <p className="font-semibold text-primary uppercase" style={{ fontSize: 13, letterSpacing: ".08em", margin: "0 0 6px" }}>
            Plataforma VOZ
          </p>
          <h1 className="font-bold" style={{ fontFamily: '"Archivo", sans-serif', fontSize: 28, margin: "0 0 4px" }}>
            Dashboard
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 13, margin: 0 }}>
            {loading ? "Carregando…" : "Visão geral em tempo real da plataforma."}
          </p>
        </div>

        {/* KPI grid */}
        <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
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

        <div className="grid gap-6 mb-8" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {/* Monthly revenue chart */}
          <div className="bg-muted border border-border rounded-2xl p-6">
            <p className="font-semibold" style={{ fontFamily: '"Archivo", sans-serif', fontSize: 15, margin: "0 0 20px" }}>
              Receita mensal (últimos 6 meses)
            </p>
            {loading ? (
              <p className="text-muted-foreground" style={{ fontSize: 13 }}>Carregando…</p>
            ) : (
              <div className="flex items-end gap-2.5" style={{ height: 120 }}>
                {stats?.monthlyRevenue.map(m => {
                  const h = maxMonthly > 0 ? Math.max(4, Math.round((m.amount / maxMonthly) * 100)) : 4;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-muted-foreground" style={{ fontSize: 10 }}>
                        {m.amount > 0 ? brl(m.amount).replace("R$ ", "") : ""}
                      </span>
                      <div className="w-full rounded" style={{ height: h, background: m.amount > 0 ? "hsl(var(--primary))" : "hsl(var(--border))" }} />
                      <span className="text-muted-foreground whitespace-nowrap" style={{ fontSize: 11 }}>{m.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Users breakdown */}
          <div className="bg-muted border border-border rounded-2xl p-6">
            <p className="font-semibold" style={{ fontFamily: '"Archivo", sans-serif', fontSize: 15, margin: "0 0 20px" }}>
              Distribuição de usuários
            </p>
            {loading || !stats ? (
              <p className="text-muted-foreground" style={{ fontSize: 13 }}>Carregando…</p>
            ) : (
              <div className="flex flex-col gap-4">
                <UserBar label="Gratuito" count={stats.users.free} total={stats.users.total} color="hsl(var(--muted-foreground))" />
                <UserBar label="Pagante" count={stats.users.paid} total={stats.users.total} color="hsl(var(--primary))" />
                <div className="mt-2 pt-4 border-t border-border">
                  <div className="flex justify-between text-muted-foreground" style={{ fontSize: 13 }}>
                    <span>Taxa de conversão</span>
                    <span className="font-semibold text-foreground">
                      {stats.users.total > 0 ? ((stats.users.paid / stats.users.total) * 100).toFixed(1) : "0"}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent payments */}
        <div className="bg-muted border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="font-semibold m-0" style={{ fontFamily: '"Archivo", sans-serif', fontSize: 15 }}>
              Pagamentos recentes
            </p>
            <Link href="/plataforma/financeiro" className="flex items-center gap-1 font-medium text-primary no-underline" style={{ fontSize: 13 }}>
              Ver todos <ArrowUpRight size={13} />
            </Link>
          </div>

          {loading ? (
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>Carregando…</p>
          ) : recentPayments.length === 0 ? (
            <p className="text-center text-muted-foreground py-6" style={{ fontSize: 13 }}>
              Nenhum pagamento registrado ainda.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr className="border-b border-border">
                    {["Usuário", "Evento", "Valor", "Status", "Data"].map(h => (
                      <th key={h} className="text-left font-semibold text-muted-foreground uppercase" style={{ padding: "0 12px 12px 0", fontSize: 12, letterSpacing: ".05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map(p => (
                    <tr key={p.id} className="border-b border-border">
                      <td style={{ padding: "12px 12px 12px 0" }}>
                        <p className="m-0 font-medium">{p.ownerName}</p>
                        <p className="m-0 text-muted-foreground" style={{ fontSize: 12 }}>{p.ownerEmail}</p>
                      </td>
                      <td className="text-muted-foreground" style={{ padding: "12px 12px 12px 0" }}>{p.eventName}</td>
                      <td className="font-semibold" style={{ padding: "12px 12px 12px 0" }}>{brl(p.amount)}</td>
                      <td style={{ padding: "12px 12px 12px 0" }}>
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="text-muted-foreground" style={{ padding: "12px 0 12px 0" }}>
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
    <div
      className={`rounded-[14px] p-5 border ${highlight ? "bg-primary/5 border-primary/25" : "bg-muted border-border"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-muted-foreground uppercase" style={{ fontSize: 12, letterSpacing: ".06em" }}>{label}</span>
        <span style={{ color, opacity: .7 }}>{icon}</span>
      </div>
      <p className={`font-bold ${highlight ? "text-primary" : "text-foreground"}`} style={{ fontFamily: '"Archivo", sans-serif', fontSize: 26, margin: "0 0 4px" }}>
        {value}
      </p>
      <p className="text-muted-foreground m-0" style={{ fontSize: 12 }}>{sub}</p>
    </div>
  );
}

function UserBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between mb-1.5" style={{ fontSize: 13 }}>
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{count} <span className="font-normal text-muted-foreground">({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
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

export function PlataformaHeader({ active }: { active: "dashboard" | "financeiro" | "usuarios" | "configuracoes" }) {
  const { signOut } = useClerk();
  const { name, email } = useAppUser();

  const initials = name
    ? name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")
    : "?";

  const links: { href: string; label: string; key: typeof active }[] = [
    { href: "/plataforma", label: "Dashboard", key: "dashboard" },
    { href: "/plataforma/financeiro", label: "Financeiro", key: "financeiro" },
    { href: "/plataforma/usuarios", label: "Usuários", key: "usuarios" },
    { href: "/plataforma/configuracoes", label: "Configurações", key: "configuracoes" },
  ];

  return (
    <header className="flex items-center gap-3 px-6 border-b border-border bg-background sticky top-0 z-40" style={{ height: 60 }}>
      <VozWordmark size={20} />
      <span className="font-bold text-primary uppercase py-0.5 px-2 rounded bg-primary/10 shrink-0" style={{ fontSize: 11, letterSpacing: ".1em" }}>
        Super Admin
      </span>

      <nav className="flex gap-0.5 ml-1">
        {links.map(l => (
          <Link
            key={l.key}
            href={l.href}
            className={`py-1.5 px-3 rounded-lg font-medium no-underline ${active === l.key ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            style={{ fontSize: 13 }}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      {/* User identity */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-full bg-primary font-bold shrink-0 select-none"
            style={{ width: 32, height: 32, color: "#fff", fontSize: 12 }}
          >
            {initials}
          </div>
          <div className="flex flex-col gap-px">
            <span className="font-semibold" style={{ fontSize: 13, lineHeight: 1 }}>
              {name ?? "—"}
            </span>
            <span className="text-muted-foreground" style={{ fontSize: 11, lineHeight: 1 }}>
              {email ?? ""}
            </span>
          </div>
        </div>

        <div className="bg-border" style={{ width: 1, height: 28 }} aria-hidden />

        <button
          onClick={() => signOut({ redirectUrl: "/entrar" })}
          title="Sair da plataforma"
          className="flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-border bg-transparent text-muted-foreground font-medium cursor-pointer"
          style={{ fontSize: 13, fontFamily: "inherit" }}
        >
          <LogOut size={14} aria-hidden /> Sair
        </button>
      </div>
    </header>
  );
}
