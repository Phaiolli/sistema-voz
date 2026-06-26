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
    <div className="flex min-h-[100dvh] flex-col">
      <a href="#form-pergunta" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-background focus:text-foreground">
        Pular para o formulário
      </a>

      <header className="flex h-[52px] shrink-0 items-center justify-between px-3">
        <Link href={`/e/${slug}`} className="inline-flex items-center gap-1.5 rounded-lg p-2 text-sm text-white no-underline">
          <ArrowLeft size={20} aria-hidden />
          Voltar
        </Link>
        <VozLockup eventName={eventName} size={16} inverse />
        <div className="w-[72px]" aria-hidden />
      </header>

      <main id="form-pergunta" className="flex flex-1 flex-col gap-5 px-6 pt-2 pb-6">
        <div>
          <h1 className="m-0 text-[26px] font-bold leading-[1.15] text-white" style={{ fontFamily: '"Archivo", sans-serif' }}>
            Sua pergunta vai{" "}
            <span className="text-accent">direto</span> para o mediador.
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {anonymous
              ? <>Sua pergunta será lida como <strong className="text-white">&quot;Anônimo&quot;</strong> no palco.</>
              : "Seu nome aparece no palco quando ela for lida."}
          </p>
        </div>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
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
          <label className="-mt-2 flex cursor-pointer items-center gap-2.5">
            <div
              role="checkbox"
              aria-checked={anonymous}
              tabIndex={0}
              onClick={() => setAnonymous((v) => !v)}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setAnonymous((v) => !v); } }}
              className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-[1.5px] border-solid"
              style={{
                borderColor: anonymous ? "hsl(var(--accent))" : "hsl(var(--border))",
                background: anonymous ? "hsl(var(--accent))" : "hsl(var(--muted))",
              }}
            >
              {anonymous && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--accent-foreground))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
            <span className="text-sm text-white">
              Enviar como anônimo
              <span className="text-[13px] text-muted-foreground"> · seu nome não será exibido no palco</span>
            </span>
          </label>

          {anonymous && (
            <div className="-mt-2 flex items-start gap-2 rounded-lg border border-border bg-muted px-3.5 py-2.5">
              <EyeOff size={15} className="mt-px shrink-0 text-muted-foreground" aria-hidden />
              <p className="m-0 text-[13px] leading-normal text-muted-foreground">
                Seu nome e contato ficam apenas com o mediador do evento. A pergunta aparece como <strong className="text-white">&quot;Anônimo&quot;</strong> para a plateia.
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
              className="mt-1 text-right text-[13px]"
              style={{ color: overChars ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))", fontWeight: overChars ? 600 : 400 }}
            >
              {chars} / {MAX}
            </div>
          </Field>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-white">
            <div
              role="checkbox"
              aria-checked={lgpd}
              tabIndex={0}
              onClick={() => setLgpd((v) => !v)}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setLgpd((v) => !v); } }}
              className="mt-px flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-[1.5px] border-solid"
              style={{
                borderColor: lgpd ? "hsl(var(--accent))" : "hsl(var(--border))",
                background: lgpd ? "hsl(var(--accent))" : "hsl(var(--muted))",
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
              <span className="text-muted-foreground">(LGPD)</span>
            </span>
          </label>
          {showErr(lgpd) && (
            <p className="-mt-2 flex items-center gap-1.5 text-[13px] text-destructive">
              <AlertCircle size={12} aria-hidden /> É preciso aceitar para enviar.
            </p>
          )}

          <div className="min-h-2 flex-1" />

          {!lgpd && (
            <p className="-mt-1 text-center text-[13px] text-muted-foreground">
              Aceite os termos acima para enviar.
            </p>
          )}

          <button
            type="submit"
            disabled={sending || !lgpd}
            className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-accent text-base font-bold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
            style={{ transition: "opacity .15s" }}
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-white">
        {label}
        {labelSuffix && <span className="font-normal text-muted-foreground"> {labelSuffix}</span>}
      </label>
      {children}
      {error && (
        <p role="alert" id={`${htmlFor}-err`} className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
          <AlertCircle size={12} aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}
