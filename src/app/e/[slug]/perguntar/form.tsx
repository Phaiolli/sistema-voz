"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, AlertCircle, EyeOff } from "lucide-react";
import { VozLockup } from "@/components/voz/wordmark";
import { toast } from "sonner";

interface Props {
  slug: string;
  eventId: string;
  eventName: string;
}

export function QuestionForm({ slug, eventId, eventName }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [lgpd, setLgpd] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const MAX = 500;
  const chars = text.length;
  const overChars = chars > MAX;
  const nameOk = name.trim().length >= 2;
  const contactOk = contact.trim().length >= 5;
  const emailOk = email.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const textOk = text.trim().length >= 10 && !overChars;
  const valid = nameOk && contactOk && emailOk && textOk && lgpd;

  const showErr = (cond: boolean) => touched && !cond;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setSending(true);
    try {
      const res = await fetch(`/api/v1/events/${eventId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name.trim(), authorContact: contact.trim(), authorEmail: email.trim() || undefined, text: text.trim(), lgpdAccepted: lgpd, anonymous }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error?.message ?? "Não foi possível enviar. Tente novamente.");
        return;
      }
      router.push(`/e/${slug}/obrigado`);
    } catch {
      toast.error("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <a href="#form-pergunta" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-background focus:text-foreground">
        Pular para o formulário
      </a>

      <header style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", flexShrink: 0 }}>
        <Link href={`/e/${slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#fff", textDecoration: "none", fontSize: 14, padding: "8px", borderRadius: 8 }}>
          <ArrowLeft size={20} aria-hidden />
          Voltar
        </Link>
        <VozLockup eventName={eventName} size={16} inverse />
        <div style={{ width: 72 }} aria-hidden />
      </header>

      <main id="form-pergunta" style={{ flex: 1, padding: "8px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 26, lineHeight: 1.15, color: "#fff", margin: 0 }}>
            Sua pergunta vai{" "}
            <span style={{ color: "hsl(var(--accent))" }}>direto</span> para o mediador.
          </h1>
          <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 14, marginTop: 6 }}>
            {anonymous
              ? <>Sua pergunta será lida como <strong style={{ color: "#fff" }}>&quot;Anônimo&quot;</strong> no palco.</>
              : "Seu nome aparece no palco quando ela for lida."}
          </p>
        </div>

        <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field
            label="Seu nome"
            labelSuffix={anonymous ? "· só para o mediador, não será exibido" : undefined}
            htmlFor="f-name"
            error={showErr(nameOk) ? "Digite seu nome completo." : undefined}
          >
            <input
              id="f-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Marina Ribeiro"
              autoComplete="name"
              aria-describedby={showErr(nameOk) ? "f-name-err" : undefined}
              style={inputStyle(showErr(nameOk))}
            />
          </Field>

          {/* Toggle anônimo */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: -8 }}>
            <div
              role="checkbox"
              aria-checked={anonymous}
              tabIndex={0}
              onClick={() => setAnonymous((v) => !v)}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setAnonymous((v) => !v); } }}
              style={{
                width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                border: "1.5px solid", cursor: "pointer",
                borderColor: anonymous ? "hsl(var(--accent))" : "hsl(var(--border))",
                background: anonymous ? "hsl(var(--accent))" : "hsl(var(--muted))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {anonymous && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--accent-foreground))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: 14, color: "#fff" }}>
              Enviar como anônimo
              <span style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}> · seu nome não será exibido no palco</span>
            </span>
          </label>

          {anonymous && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", borderRadius: 8, background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", marginTop: -8 }}>
              <EyeOff size={15} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0, marginTop: 1 }} aria-hidden />
              <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.5 }}>
                Seu nome e contato ficam apenas com o mediador do evento. A pergunta aparece como <strong style={{ color: "#fff" }}>&quot;Anônimo&quot;</strong> para a plateia.
              </p>
            </div>
          )}

          <Field
            label="WhatsApp"
            htmlFor="f-contact"
            error={showErr(contactOk) ? "Informe seu WhatsApp." : undefined}
          >
            <input
              id="f-contact"
              type="tel"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="(11) 90000-0000"
              autoComplete="tel"
              aria-describedby={showErr(contactOk) ? "f-contact-err" : undefined}
              style={inputStyle(showErr(contactOk))}
            />
          </Field>

          <Field
            label="E-mail"
            labelSuffix="· opcional"
            htmlFor="f-email"
            error={touched && !emailOk ? "E-mail inválido." : undefined}
          >
            <input
              id="f-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              autoComplete="email"
              aria-describedby={touched && !emailOk ? "f-email-err" : undefined}
              style={inputStyle(touched && !emailOk)}
            />
          </Field>

          <Field
            label="Sua pergunta"
            htmlFor="f-q"
            error={showErr(textOk) ? (overChars ? "Limite de 500 caracteres." : "Escreva pelo menos 10 caracteres.") : undefined}
          >
            <textarea
              id="f-q"
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="O que você gostaria de perguntar aos palestrantes?"
              maxLength={MAX + 50}
              aria-describedby={`f-q-counter${showErr(textOk) ? " f-q-err" : ""}`}
              style={{ ...inputStyle(showErr(textOk)), minHeight: 140, resize: "vertical" }}
            />
            <div
              id="f-q-counter"
              aria-live="polite"
              style={{ fontSize: 13, marginTop: 4, textAlign: "right", color: overChars ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))", fontWeight: overChars ? 600 : 400 }}
            >
              {chars} / {MAX}
            </div>
          </Field>

          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", color: "#fff", fontSize: 14 }}>
            <div
              role="checkbox"
              aria-checked={lgpd}
              tabIndex={0}
              onClick={() => setLgpd((v) => !v)}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setLgpd((v) => !v); } }}
              style={{
                width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
                border: "1.5px solid", cursor: "pointer",
                borderColor: lgpd ? "hsl(var(--accent))" : "hsl(var(--border))",
                background: lgpd ? "hsl(var(--accent))" : "hsl(var(--muted))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {lgpd && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--accent-foreground))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
            <span>
              Concordo com o uso dos meus dados para este evento.{" "}
              <span style={{ color: "hsl(var(--muted-foreground))" }}>(LGPD)</span>
            </span>
          </label>
          {showErr(lgpd) && (
            <p style={{ color: "hsl(var(--destructive))", fontSize: 13, display: "flex", alignItems: "center", gap: 6, margin: "-8px 0 0" }}>
              <AlertCircle size={12} aria-hidden /> É preciso aceitar para enviar.
            </p>
          )}

          <div style={{ flex: 1, minHeight: 8 }} />

          {!lgpd && (
            <p style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: 13, margin: "-4px 0 0" }}>
              Aceite os termos acima para enviar.
            </p>
          )}

          <button
            type="submit"
            disabled={sending || !lgpd}
            style={{
              height: 52, width: "100%", borderRadius: 10, border: "none", cursor: (sending || !lgpd) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontSize: 16, fontWeight: 700,
              background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))",
              opacity: (sending || !lgpd) ? 0.4 : 1, transition: "opacity .15s",
            }}
          >
            {sending ? "Enviando…" : <><Send size={18} aria-hidden /> Enviar pergunta</>}
          </button>
        </form>
      </main>
    </div>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    border: "1.5px solid",
    borderColor: hasError ? "hsl(var(--destructive))" : "hsl(var(--border))",
    background: "hsl(var(--muted))",
    color: "#fff",
    fontSize: 16,
    fontFamily: "inherit",
    boxShadow: hasError ? "0 0 0 2px hsl(var(--destructive) / .2)" : "none",
    outline: "none",
    boxSizing: "border-box",
  };
}

interface FieldProps {
  label: string;
  labelSuffix?: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, labelSuffix, htmlFor, error, children }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>
        {label}
        {labelSuffix && <span style={{ color: "hsl(var(--muted-foreground))", fontWeight: 400 }}> {labelSuffix}</span>}
      </label>
      {children}
      {error && (
        <p role="alert" id={`${htmlFor}-err`} style={{ color: "hsl(var(--destructive))", fontSize: 13, display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
          <AlertCircle size={12} aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}
