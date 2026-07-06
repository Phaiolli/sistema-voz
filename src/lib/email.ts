/**
 * Transactional e-mail via Resend, with a shared branded layout.
 *
 * Every sender is **best-effort**: when `RESEND_API_KEY` is unset the functions
 * are no-ops, and a delivery failure is logged but never thrown — the caller's
 * flow (Stripe/Clerk webhooks, registration) must not fail because e-mail did.
 *
 * The layout uses table-based HTML with inline styles for broad e-mail-client
 * compatibility (Gmail, Outlook, Apple Mail). Brand palette mirrors the app:
 * purple `hsl(268 62% 52%)` + gold `#f2b33d`. See `docs/runbook/dominio-dns.md`
 * for SPF/DKIM/DMARC (#70).
 */
import { Resend } from "resend";
import { logError } from "@/lib/log";
import { SITE_URL } from "@/lib/site";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "voz. <no-reply@useavoz.app>";

const client = apiKey ? new Resend(apiKey) : null;

// ── Brand palette (email-safe hex) ─────────────────────────────────────────
const INK = "#1a1523";
const MUTED = "#6b6577";
const PURPLE = "#6d3fd4";
const HEADER_BG = "#1e1140";
const GOLD = "#f2b33d";
const PAGE_BG = "#f4f2f8";
const BORDER = "#ece9f2";

/** Whether transactional e-mail is configured in this environment. */
export function isEmailEnabled(): boolean {
  return client !== null;
}

/** Escapes user-supplied values before interpolating them into e-mail HTML. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A branded, table-based CTA button. */
function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
    <tr><td style="border-radius:10px;background:${PURPLE}">
      <a href="${href}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">${esc(label)}</a>
    </td></tr>
  </table>`;
}

interface EmailContent {
  /** Hidden preview text shown in the inbox list. */
  preheader: string;
  heading: string;
  /** Inner HTML of the body (paragraphs already escaped by the caller). */
  contentHtml: string;
  cta?: { label: string; href: string };
}

/** Wraps content in the shared branded shell. */
function renderEmail({
  preheader,
  heading,
  contentHtml,
  cta,
}: EmailContent): string {
  const host = SITE_URL.replace(/^https?:\/\//, "");
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${PAGE_BG}">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER}">
        <tr><td style="background:${HEADER_BG};padding:24px 32px">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:800;letter-spacing:-1px;color:#ffffff">voz<span style="color:${GOLD}">.</span></span>
        </td></tr>
        <tr><td style="padding:32px 32px 8px">
          <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;color:${INK}">${esc(heading)}</h1>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${INK}">${contentHtml}</div>
          ${cta ? button(cta.label, cta.href) : ""}
        </td></tr>
        <tr><td style="padding:24px 32px 32px">
          <hr style="border:none;border-top:1px solid ${BORDER};margin:0 0 16px">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${MUTED}">
            voz. — perguntas ao vivo para eventos presenciais.<br>
            <a href="${SITE_URL}" style="color:${PURPLE};text-decoration:none">${esc(host)}</a>
            &nbsp;·&nbsp;<a href="${SITE_URL}/termos" style="color:${MUTED};text-decoration:none">Termos</a>
            &nbsp;·&nbsp;<a href="${SITE_URL}/privacidade" style="color:${MUTED};text-decoration:none">Privacidade</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Sends one e-mail. No-op when unconfigured; never throws. */
async function send({ to, subject, html, text }: SendArgs): Promise<void> {
  if (!client) return;
  try {
    const { error } = await client.emails.send({
      from: FROM,
      to,
      subject,
      html,
      text,
    });
    if (error) logError("email.send", error);
  } catch (err) {
    logError("email.send", err);
  }
}

// ── Templates ───────────────────────────────────────────────────────────────

/** Welcome e-mail for a brand-new organizer account (Clerk `user.created`). */
export async function sendWelcomeEmail(
  to: string,
  name: string | null,
): Promise<void> {
  const first = name?.split(" ")[0] ?? null;
  const greeting = first
    ? `Bem-vindo(a), ${esc(first)}!`
    : "Bem-vindo(a) à voz.!";
  await send({
    to,
    subject: "Bem-vindo(a) à voz.",
    text: `${first ? `Bem-vindo(a), ${first}!` : "Bem-vindo(a) à voz.!"}\n\nSua conta está pronta. Crie seu primeiro evento e comece a receber perguntas do público em tempo real.\n\nComece em ${SITE_URL}/dashboard\n\nEquipe voz.`,
    html: renderEmail({
      preheader: "Sua conta na voz. está pronta.",
      heading: greeting,
      contentHtml: `<p style="margin:0 0 12px">Sua conta está pronta. Crie seu primeiro evento e comece a receber perguntas do público em tempo real — sem app para instalar.</p>`,
      cta: {
        label: "Criar meu primeiro evento",
        href: `${SITE_URL}/dashboard`,
      },
    }),
  });
}

/** Confirmation that a participant's event registration was received. */
export async function sendRegistrationConfirmationEmail(
  to: string,
  name: string,
  eventName: string,
): Promise<void> {
  await send({
    to,
    subject: `Inscrição confirmada — ${eventName}`,
    text: `Olá, ${name}!\n\nSua inscrição em "${eventName}" foi confirmada. Guarde este e-mail para o credenciamento no dia do evento.\n\nEquipe voz.`,
    html: renderEmail({
      preheader: `Sua inscrição em ${eventName} foi confirmada.`,
      heading: `Inscrição confirmada 🎉`,
      contentHtml: `<p style="margin:0 0 12px">Olá, ${esc(name)}! Sua inscrição em <strong>${esc(eventName)}</strong> foi confirmada.</p>
        <p style="margin:0">Guarde este e-mail — ele serve para o seu credenciamento no dia do evento.</p>`,
    }),
  });
}

/** Receipt for a one-time per-event purchase (`plan: event`). */
export async function sendEventPurchaseReceiptEmail(
  to: string,
  name: string | null,
  eventName: string,
): Promise<void> {
  const greeting = name ? `Olá, ${esc(name)}!` : "Olá!";
  await send({
    to,
    subject: `Pagamento confirmado — ${eventName}`,
    text: `${name ? `Olá, ${name}!` : "Olá!"}\n\nRecebemos o pagamento do evento "${eventName}". Ele já está liberado com perguntas ilimitadas.\n\nAcesse seu painel em ${SITE_URL}/dashboard\n\nEquipe voz.`,
    html: renderEmail({
      preheader: `Pagamento do evento ${eventName} confirmado.`,
      heading: "Pagamento confirmado",
      contentHtml: `<p style="margin:0 0 12px">${greeting}</p>
        <p style="margin:0">Recebemos o pagamento do evento <strong>${esc(eventName)}</strong>. Ele já está liberado com <strong>perguntas ilimitadas</strong>.</p>`,
      cta: { label: "Ir para o painel", href: `${SITE_URL}/dashboard` },
    }),
  });
}

/** Receipt confirming a Pro subscription payment (first charge and renewals). */
export async function sendSubscriptionReceiptEmail(
  to: string,
  name: string | null,
): Promise<void> {
  const greeting = name ? `Olá, ${esc(name)}!` : "Olá!";
  await send({
    to,
    subject: "Pagamento confirmado — assinatura Pro da voz.",
    text: `${name ? `Olá, ${name}!` : "Olá!"}\n\nRecebemos o pagamento da sua assinatura Pro. Seus eventos e perguntas estão liberados sem limites.\n\nGerencie sua assinatura em ${SITE_URL}/conta\n\nEquipe voz.`,
    html: renderEmail({
      preheader: "Pagamento da assinatura Pro confirmado.",
      heading: "Assinatura Pro ativa",
      contentHtml: `<p style="margin:0 0 12px">${greeting}</p>
        <p style="margin:0">Recebemos o pagamento da sua <strong>assinatura Pro</strong>. Seus eventos e perguntas estão liberados sem limites.</p>`,
      cta: { label: "Gerenciar assinatura", href: `${SITE_URL}/conta` },
    }),
  });
}

/** Confirmation that a Pro subscription was canceled. */
export async function sendSubscriptionCanceledEmail(
  to: string,
  name: string | null,
): Promise<void> {
  const greeting = name ? `Olá, ${esc(name)}!` : "Olá!";
  await send({
    to,
    subject: "Assinatura Pro cancelada",
    text: `${name ? `Olá, ${name}!` : "Olá!"}\n\nSua assinatura Pro foi cancelada. Você mantém o acesso até o fim do período já pago; depois disso a conta volta ao plano gratuito.\n\nMudou de ideia? Você pode reativar em ${SITE_URL}/planos\n\nEquipe voz.`,
    html: renderEmail({
      preheader: "Sua assinatura Pro foi cancelada.",
      heading: "Assinatura cancelada",
      contentHtml: `<p style="margin:0 0 12px">${greeting}</p>
        <p style="margin:0 0 12px">Sua <strong>assinatura Pro</strong> foi cancelada. Você mantém o acesso até o fim do período já pago; depois disso a conta volta ao plano gratuito.</p>
        <p style="margin:0">Mudou de ideia? Você pode reativar quando quiser.</p>`,
      cta: { label: "Ver planos", href: `${SITE_URL}/planos` },
    }),
  });
}

/** Dunning notice when a subscription invoice fails. */
export async function sendPaymentFailedEmail(
  to: string,
  name: string | null,
): Promise<void> {
  const greeting = name ? `Olá, ${esc(name)}!` : "Olá!";
  await send({
    to,
    subject: "Não conseguimos processar seu pagamento",
    text: `${name ? `Olá, ${name}!` : "Olá!"}\n\nNão conseguimos processar a cobrança da sua assinatura Pro. Para não perder o acesso, atualize sua forma de pagamento.\n\nAtualize em ${SITE_URL}/conta\n\nEquipe voz.`,
    html: renderEmail({
      preheader: "Falha na cobrança da sua assinatura Pro.",
      heading: "Falha no pagamento",
      contentHtml: `<p style="margin:0 0 12px">${greeting}</p>
        <p style="margin:0">Não conseguimos processar a cobrança da sua <strong>assinatura Pro</strong>. Para não perder o acesso, atualize sua forma de pagamento.</p>`,
      cta: { label: "Atualizar pagamento", href: `${SITE_URL}/conta` },
    }),
  });
}
