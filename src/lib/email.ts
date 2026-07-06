/**
 * Transactional e-mail via Resend. Every sender is **best-effort**: when
 * `RESEND_API_KEY` is unset (local/dev, or before the domain is verified) the
 * functions are no-ops, and a delivery failure is logged but never thrown — the
 * caller's flow (Stripe webhook, registration) must not fail because e-mail did.
 *
 * See ADR references in the launch runbook for SPF/DKIM/DMARC setup (#70).
 */
import { Resend } from "resend";
import { logError } from "@/lib/log";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "voz. <no-reply@useavoz.app>";

const client = apiKey ? new Resend(apiKey) : null;

/** Whether transactional e-mail is configured in this environment. */
export function isEmailEnabled(): boolean {
  return client !== null;
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

/** Escapes user-supplied values before interpolating them into e-mail HTML. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Minimal branded wrapper so both e-mails share a consistent look. */
function layout(bodyHtml: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1a1523">
  <p style="font-size:22px;font-weight:800;letter-spacing:-.5px">voz<span style="color:#e6a817">.</span></p>
  ${bodyHtml}
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
  <p style="font-size:12px;color:#8a8594">${SITE_NAME} — <a href="${SITE_URL}" style="color:#6b46c1">${SITE_URL.replace(/^https?:\/\//, "")}</a></p>
</div>`;
}

/** Receipt confirming a Pro subscription payment. */
export async function sendSubscriptionReceiptEmail(
  to: string,
  name: string | null,
): Promise<void> {
  const greeting = name ? `Olá, ${name}!` : "Olá!";
  await send({
    to,
    subject: "Pagamento confirmado — assinatura Pro da voz.",
    text: `${greeting}\n\nRecebemos o pagamento da sua assinatura Pro. Seus eventos e perguntas estão liberados sem limites.\n\nGerencie sua assinatura em ${SITE_URL}/conta.\n\nEquipe voz.`,
    html: layout(
      `<p>${esc(greeting)}</p>
       <p>Recebemos o pagamento da sua <strong>assinatura Pro</strong>. Seus eventos e perguntas estão liberados sem limites.</p>
       <p><a href="${SITE_URL}/conta" style="color:#6b46c1">Gerenciar assinatura</a></p>`,
    ),
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
    html: layout(
      `<p>Olá, ${esc(name)}!</p>
       <p>Sua inscrição em <strong>${esc(eventName)}</strong> foi confirmada. Guarde este e-mail para o credenciamento no dia do evento.</p>`,
    ),
  });
}
