"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VozWordmark } from "@/components/voz/wordmark";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { Event, RegistrationConfig } from "@/lib/types";

function getRegistrationStatus(reg: RegistrationConfig | undefined): "disabled" | "not_open" | "closed" | "open" {
  if (!reg?.enabled) return "disabled";
  const now = new Date();
  if (reg.opensAt && new Date(reg.opensAt) > now) return "not_open";
  if (reg.closesAt && new Date(reg.closesAt) < now) return "closed";
  return "open";
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBanner({ status, reg }: { status: ReturnType<typeof getRegistrationStatus>; reg?: RegistrationConfig }) {
  const configs = {
    disabled: { color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))", msg: "Inscrições não estão disponíveis para este evento." },
    not_open: { color: "hsl(38 85% 40%)", bg: "hsl(var(--accent) / .12)", msg: `Inscrições abrem em ${reg?.opensAt ? fmt(reg.opensAt) : "breve"}.` },
    closed: { color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))", msg: `Inscrições encerradas${reg?.closesAt ? " em " + fmt(reg.closesAt) : ""}.` },
  } as const;
  if (status === "open") return null;
  const cfg = configs[status];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 16px", borderRadius: 10, background: cfg.bg, color: cfg.color, fontSize: 14 }}>
      <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
      <span>{cfg.msg}</span>
    </div>
  );
}

export function InscricaoForm({ event }: { event: Event }) {
  const router = useRouter();
  const reg = event.config?.registration;
  const status = getRegistrationStatus(reg);

  const [form, setForm] = useState({ name: "", email: "", phone: "", document: "", lgpdAccepted: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid hsl(var(--border))",
    background: "hsl(var(--muted))", color: "hsl(var(--foreground))", fontSize: 15, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/events/${event.id}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone || undefined, document: form.document || undefined, lgpdAccepted: form.lgpdAccepted }),
      });
      const data = await res.json() as { id?: string; error?: { message?: string } };
      if (!res.ok) { setError(data.error?.message ?? "Erro ao realizar inscrição."); return; }
      router.push(`/e/${event.slug}/inscricao/confirmacao?id=${data.id}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ marginBottom: 32 }}>
          <VozWordmark size={22} />
          <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: "12px 0 4px" }}>{event.name}</p>
          <p style={{ fontSize: 15, color: "hsl(var(--muted-foreground))", margin: 0 }}>Formulário de inscrição</p>
        </div>

        <StatusBanner status={status} reg={reg} />

        {status === "open" && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }} noValidate>
            {error && (
              <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "hsl(var(--destructive) / .08)", borderRadius: 8, color: "hsl(var(--destructive))", fontSize: 14 }}>
                <AlertCircle size={15} aria-hidden /> {error}
              </div>
            )}

            <Field label="Nome completo *" htmlFor="reg-name">
              <input id="reg-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inp} autoComplete="name" />
            </Field>
            <Field label="E-mail *" htmlFor="reg-email">
              <input id="reg-email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={inp} autoComplete="email" />
            </Field>
            <Field label="Telefone" htmlFor="reg-phone">
              <input id="reg-phone" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={inp} autoComplete="tel" placeholder="(00) 00000-0000" />
            </Field>
            <Field label="CPF" htmlFor="reg-doc">
              <input id="reg-doc" value={form.document} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} style={inp} placeholder="000.000.000-00" />
            </Field>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>
              <input
                type="checkbox"
                checked={form.lgpdAccepted}
                onChange={(e) => setForm((f) => ({ ...f, lgpdAccepted: e.target.checked }))}
                style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, accentColor: "hsl(var(--primary))", cursor: "pointer" }}
                required
              />
              Aceito o tratamento dos meus dados pessoais para fins de credenciamento neste evento, conforme a LGPD.
            </label>

            <button
              type="submit"
              disabled={busy || !form.lgpdAccepted}
              style={{ height: 52, borderRadius: 10, border: "none", cursor: busy || !form.lgpdAccepted ? "not-allowed" : "pointer", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 16, fontWeight: 700, opacity: busy || !form.lgpdAccepted ? 0.65 : 1 }}
            >
              {busy ? "Inscrevendo…" : "Confirmar inscrição"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 14, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}
