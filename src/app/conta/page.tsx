"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { VozWordmark } from "@/components/voz/wordmark";
import { EnvSwitcher } from "@/components/voz/env-switcher";
import { toast } from "sonner";
import { LogOut, KeyRound, User, CreditCard, CheckCircle, Clock, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

interface PlanData {
  plan: string;
  totalEvents: number;
  totalSpent: number;
  payments: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    eventName: string | null;
    createdAt: string;
    paidAt: string | null;
  }[];
}

const inp: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1.5px solid hsl(var(--border))",
  background: "hsl(var(--background))",
  color: "hsl(var(--foreground))",
  fontSize: 14,
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
  minHeight: 44,
};

function initials(name: string | null | undefined, email: string | null | undefined) {
  if (name) return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return email?.[0]?.toUpperCase() ?? "?";
}

function roleLabel(role: string | undefined) {
  if (role === "superadmin") return "Super Admin";
  if (role === "admin") return "Administrador";
  if (role === "mediador") return "Moderador";
  if (role === "owner") return "Proprietário";
  return role ?? "—";
}

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ContaPage() {
  const { data: session, update } = useSession();
  const u = session?.user as { id?: string; name?: string | null; email?: string | null; role?: string; plan?: string } | undefined;

  const [name, setName] = useState(u?.name ?? "");
  const [savingName, setSavingName] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/me/plan")
      .then((r) => r.ok ? r.json() : null)
      .then((d: PlanData | null) => setPlanData(d))
      .catch(() => null)
      .finally(() => setPlanLoading(false));
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!u?.id || !name.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/v1/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        toast.error(err.message ?? "Erro ao salvar nome.");
        return;
      }
      await update({ name: name.trim() });
      toast.success("Nome atualizado.");
    } catch {
      toast.error("Erro ao salvar nome.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleSavePwd(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) { toast.error("As senhas não coincidem."); return; }
    if (newPwd.length < 8) { toast.error("A senha deve ter pelo menos 8 caracteres."); return; }
    setSavingPwd(true);
    try {
      const res = await fetch("/api/v1/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, password: newPwd }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        toast.error(err.message ?? "Erro ao alterar senha.");
        return;
      }
      toast.success("Senha alterada com sucesso.");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch {
      toast.error("Erro ao alterar senha.");
    } finally {
      setSavingPwd(false);
    }
  }

  const abbr = initials(u?.name, u?.email);
  const isPaid = (planData?.plan ?? u?.plan) === "paid";

  return (
    <div className="bg-background text-foreground" style={{ minHeight: "100dvh", paddingBottom: 88 }}>
      {/* Header */}
      <header className="flex items-center gap-2.5 border-b border-border px-4 sticky top-0 bg-background z-10" style={{ height: 56 }}>
        <VozWordmark size={20} />
        <EnvSwitcher active="admin" />
        <div className="flex-1" />
        <button
          onClick={() => signOut({ callbackUrl: "/entrar" })}
          className="inline-flex items-center gap-1.5 px-3.5 rounded-lg border border-border bg-transparent text-[13px] cursor-pointer text-foreground"
          style={{ height: 44 }}
        >
          <LogOut size={14} aria-hidden />
          <span className="conta-logout-lbl">Sair</span>
        </button>
      </header>

      <main className="mx-auto py-8 px-4 flex flex-col gap-6" style={{ maxWidth: 560 }}>
        <h1 className="font-bold m-0" style={{ fontFamily: '"Archivo", sans-serif', fontSize: "clamp(22px, 5vw, 28px)" }}>Minha conta</h1>

        {/* Avatar + info */}
        <div className="flex items-center gap-4 p-5 bg-muted rounded-xl border border-border">
          <div className="flex items-center justify-center shrink-0 rounded-full bg-primary text-primary-foreground text-xl font-bold" style={{ width: 56, height: 56 }}>
            {abbr}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base mb-1 overflow-hidden text-ellipsis whitespace-nowrap">{u?.name ?? "—"}</p>
            <p className="text-[13px] text-muted-foreground mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap">{u?.email ?? "—"}</p>
            <div className="flex gap-1.5 flex-wrap">
              <span className="py-0.5 px-2 rounded-full text-xs font-semibold text-primary" style={{ background: "hsl(var(--primary) / .12)" }}>
                {roleLabel(u?.role)}
              </span>
              {!planLoading && (
                <span className="py-0.5 px-2 rounded-full text-xs font-semibold" style={{ background: isPaid ? "hsl(142 71% 45% / .12)" : "hsl(var(--muted))", color: isPaid ? "hsl(142 71% 32%)" : "hsl(var(--muted-foreground))" }}>
                  {isPaid ? "Plano pago" : "Plano gratuito"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Plano e pagamentos */}
        <Section icon={<CreditCard size={16} />} title="Plano e pagamentos">
          {planLoading ? (
            <p className="text-[13px] text-muted-foreground m-0">Carregando…</p>
          ) : planData ? (
            <>
              {/* Resumo */}
              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <StatCard label="Eventos realizados" value={String(planData.totalEvents)} />
                <StatCard label="Total investido" value={fmtBRL(planData.totalSpent)} />
              </div>

              {/* Modelo de preço */}
              <div className="py-3 px-4 border border-border bg-background flex items-center gap-3" style={{ borderRadius: 10 }}>
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-0.5">R$ 59,90 por evento</p>
                  <p className="text-xs text-muted-foreground m-0">Pagamento único · Sem assinatura mensal</p>
                </div>
                <ExternalLink size={14} className="text-muted-foreground shrink-0" aria-hidden />
              </div>

              {/* Histórico */}
              {planData.payments.length > 0 && (
                <div>
                  <p className="text-[13px] font-semibold mb-2.5">Histórico</p>
                  <div className="flex flex-col gap-2">
                    {planData.payments.map((p) => (
                      <div key={p.id} className="flex items-center gap-2.5 py-2.5 px-3.5 bg-background border border-border rounded-[9px]">
                        <div className="shrink-0">
                          {p.status === "paid"
                            ? <CheckCircle size={16} style={{ color: "hsl(142 71% 45%)" }} aria-hidden />
                            : <Clock size={16} className="text-muted-foreground" aria-hidden />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                            {p.eventName ?? "Evento"}
                          </p>
                          <p className="text-[11px] text-muted-foreground m-0">
                            {fmtDate(p.paidAt ?? p.createdAt)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-semibold mb-0.5">{fmtBRL(p.amount)}</p>
                          <p className="text-[11px] m-0" style={{ color: p.status === "paid" ? "hsl(142 71% 32%)" : "hsl(var(--muted-foreground))" }}>
                            {p.status === "paid" ? "Pago" : "Pendente"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {planData.payments.length === 0 && (
                <p className="text-[13px] text-muted-foreground m-0 text-center py-2">
                  Nenhum evento pago ainda. Crie seu primeiro evento no painel Admin.
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-muted-foreground m-0">Não foi possível carregar os dados do plano.</p>
          )}
        </Section>

        {/* Dados pessoais */}
        <Section icon={<User size={16} />} title="Dados pessoais">
          <form onSubmit={handleSaveName} className="flex flex-col gap-3">
            <FormField label="Nome" htmlFor="c-name">
              <input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} style={inp} />
            </FormField>
            <FormField label="E-mail" htmlFor="c-email">
              <input id="c-email" value={u?.email ?? ""} readOnly style={{ ...inp, color: "hsl(var(--muted-foreground))" }} />
            </FormField>
            <div>
              <button
                type="submit"
                disabled={savingName}
                className="px-5 rounded-[9px] border-0 bg-primary text-primary-foreground text-sm font-semibold"
                style={{ height: 44, cursor: savingName ? "not-allowed" : "pointer", opacity: savingName ? 0.7 : 1 }}
              >
                {savingName ? "Salvando…" : "Salvar nome"}
              </button>
            </div>
          </form>
        </Section>

        {/* Alterar senha */}
        <Section icon={<KeyRound size={16} />} title="Alterar senha">
          <form onSubmit={handleSavePwd} className="flex flex-col gap-3">
            <FormField label="Senha atual" htmlFor="c-curr-pwd">
              <input id="c-curr-pwd" type="password" required value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} style={inp} />
            </FormField>
            <FormField label="Nova senha" htmlFor="c-new-pwd">
              <input id="c-new-pwd" type="password" required minLength={8} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} style={inp} />
            </FormField>
            <FormField label="Confirmar nova senha" htmlFor="c-confirm-pwd">
              <input id="c-confirm-pwd" type="password" required minLength={8} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} style={inp} />
            </FormField>
            <div>
              <button
                type="submit"
                disabled={savingPwd}
                className="px-5 rounded-[9px] border-0 bg-primary text-primary-foreground text-sm font-semibold"
                style={{ height: 44, cursor: savingPwd ? "not-allowed" : "pointer", opacity: savingPwd ? 0.7 : 1 }}
              >
                {savingPwd ? "Salvando…" : "Alterar senha"}
              </button>
            </div>
          </form>
        </Section>

        {/* Sair */}
        <div className="pt-2">
          <button
            onClick={() => signOut({ callbackUrl: "/entrar" })}
            className="inline-flex items-center gap-2 px-5 rounded-[9px] border bg-transparent text-sm cursor-pointer text-destructive font-medium"
            style={{ height: 44, borderColor: "hsl(var(--destructive) / .4)" }}
          >
            <LogOut size={15} aria-hidden />
            Sair da conta
          </button>
        </div>
      </main>

      <style>{`
        .conta-logout-lbl { display: inline; }
        @media (max-width: 639px) { .conta-logout-lbl { display: none; } }
      `}</style>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3.5 px-4 bg-background border border-border" style={{ borderRadius: 10 }}>
      <p className="text-xl font-bold mb-1" style={{ fontFamily: '"Archivo", sans-serif', fontVariantNumeric: "tabular-nums" }}>{value}</p>
      <p className="text-xs text-muted-foreground m-0">{label}</p>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 bg-muted rounded-xl border border-border flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h2 className="font-semibold text-[15px] m-0" style={{ fontFamily: '"Archivo", sans-serif' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium">{label}</label>
      {children}
    </div>
  );
}
