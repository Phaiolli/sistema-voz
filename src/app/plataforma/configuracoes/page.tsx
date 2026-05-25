"use client";

export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import { PlataformaHeader } from "../page";
import { FREE_EVENT_LIMIT, FREE_QUESTION_LIMIT, EVENT_PRICE_CENTS } from "@/lib/plan-limits";
import { Shield, Zap, DollarSign, Settings } from "lucide-react";

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const user = session?.user as { name?: string; email?: string } | undefined;

  const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <PlataformaHeader active="configuracoes" />

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div>
          <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 24, margin: "0 0 4px" }}>
            Configurações
          </h1>
          <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0 }}>
            Configurações gerais da plataforma VOZ.
          </p>
        </div>

        {/* Platform owner */}
        <ConfigSection icon={<Shield size={18} />} title="Conta do super-admin">
          <ConfigRow label="Nome" value={user?.name ?? "—"} />
          <ConfigRow label="E-mail" value={user?.email ?? "—"} />
          <ConfigRow label="Papel" value="Super-admin (proprietário da plataforma)" highlight />
        </ConfigSection>

        {/* Plan limits */}
        <ConfigSection icon={<Zap size={18} />} title="Limites do plano gratuito">
          <ConfigRow label="Eventos permitidos" value={`${FREE_EVENT_LIMIT} evento`} />
          <ConfigRow label="Perguntas por evento" value={`Até ${FREE_QUESTION_LIMIT} perguntas`} />
          <ConfigRow label="Funcionalidades incluídas" value="QR code, painel de moderação, modo apresentação" />
        </ConfigSection>

        {/* Pricing */}
        <ConfigSection icon={<DollarSign size={18} />} title="Preços">
          <ConfigRow label="Valor por evento adicional" value={brl(EVENT_PRICE_CENTS)} highlight />
          <ConfigRow label="Moeda" value="BRL (Real brasileiro)" />
          <ConfigRow label="Modelo de cobrança" value="Pagamento único por evento — sem assinatura recorrente" />
          <ConfigRow label="Processador de pagamento" value="Stripe" />
        </ConfigSection>

        {/* Platform info */}
        <ConfigSection icon={<Settings size={18} />} title="Informações da plataforma">
          <ConfigRow label="Nome" value="voz." />
          <ConfigRow label="URL de produção" value="https://sistema-voz-beta.vercel.app" isUrl />
          <ConfigRow label="Webhook Stripe" value="https://sistema-voz-beta.vercel.app/api/webhooks/stripe" isUrl />
          <ConfigRow label="Contato de privacidade (LGPD)" value="privacidade@voz.app" isEmail />
          <ConfigRow label="Versão" value="1.0" />
        </ConfigSection>

        <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", textAlign: "center", paddingTop: 8 }}>
          Alterações de configuração requerem deploy de código.
        </p>
      </main>
    </div>
  );
}

function ConfigSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ color: "hsl(var(--primary))" }}>{icon}</span>
        <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 16, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 12, overflow: "hidden" }}>
        {children}
      </div>
    </section>
  );
}

function ConfigRow({ label, value, highlight, isUrl, isEmail }: {
  label: string; value: string; highlight?: boolean; isUrl?: boolean; isEmail?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid hsl(var(--border))", gap: 24, flexWrap: "wrap" }}>
      <span style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>{label}</span>
      {isUrl ? (
        <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 500, color: "hsl(var(--primary))", textDecoration: "none", wordBreak: "break-all" }}>
          {value}
        </a>
      ) : isEmail ? (
        <a href={`mailto:${value}`} style={{ fontSize: 14, fontWeight: 500, color: "hsl(var(--primary))", textDecoration: "none" }}>
          {value}
        </a>
      ) : (
        <span style={{ fontSize: 14, fontWeight: highlight ? 700 : 500, color: highlight ? "hsl(var(--primary))" : "hsl(var(--foreground))", textAlign: "right" }}>
          {value}
        </span>
      )}
    </div>
  );
}
