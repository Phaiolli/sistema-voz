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
    <div className="flex items-start gap-2.5 rounded-[10px] px-4 py-3.5 text-sm" style={{ background: cfg.bg, color: cfg.color }}>
      <AlertCircle size={16} className="mt-px shrink-0" />
      <span>{cfg.msg}</span>
    </div>
  );
}

export function InscricaoForm({ event }: { event: Event }) {
  const router = useRouter();
  const reg = event.config?.registration;
  const status = getRegistrationStatus(reg);

  const [form, setForm] = useState({ name: "", email: "", phone: "", lgpdAccepted: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const inpClass =
    "box-border w-full rounded-[10px] border-[1.5px] border-border bg-muted px-3.5 py-3 text-[15px] text-foreground font-[inherit] outline-none";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/events/${event.id}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone || undefined, lgpdAccepted: form.lgpdAccepted }),
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
    <div className="flex min-h-[100dvh] flex-col items-center px-6 py-10">
      <div className="w-full max-w-[480px]">
        <div className="mb-8">
          <VozWordmark size={22} />
          <p className="mt-3 mb-1 text-[22px] font-bold" style={{ fontFamily: '"Archivo", sans-serif' }}>{event.name}</p>
          <p className="m-0 text-[15px] text-muted-foreground">Formulário de inscrição</p>
        </div>

        <StatusBanner status={status} reg={reg} />

        {status === "open" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle size={15} aria-hidden /> {error}
              </div>
            )}

            <Field label="Nome completo *" htmlFor="reg-name">
              <input id="reg-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inpClass} autoComplete="name" />
            </Field>
            <Field label="E-mail *" htmlFor="reg-email">
              <input id="reg-email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inpClass} autoComplete="email" />
            </Field>
            <Field label="Telefone" htmlFor="reg-phone">
              <input id="reg-phone" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inpClass} autoComplete="tel" placeholder="(00) 00000-0000" />
            </Field>

            <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-normal text-muted-foreground">
              <input
                type="checkbox"
                checked={form.lgpdAccepted}
                onChange={(e) => setForm((f) => ({ ...f, lgpdAccepted: e.target.checked }))}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
                style={{ accentColor: "hsl(var(--primary))" }}
                required
              />
              Aceito o tratamento dos meus dados pessoais para fins de credenciamento neste evento, conforme a LGPD.
            </label>

            <button
              type="submit"
              disabled={busy || !form.lgpdAccepted}
              className="h-[52px] cursor-pointer rounded-[10px] border-0 bg-primary text-base font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-65"
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
