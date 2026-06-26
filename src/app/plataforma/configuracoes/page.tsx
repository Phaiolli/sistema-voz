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
    <div className="bg-background text-foreground" style={{ minHeight: "100dvh" }}>
      <PlataformaHeader active="configuracoes" />

      <main className="mx-auto flex flex-col gap-7 px-6 py-8" style={{ maxWidth: 860 }}>
        <div>
          <h1 className="font-bold" style={{ fontFamily: '"Archivo", sans-serif', fontSize: 24, margin: "0 0 4px" }}>
            Configurações
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 13, margin: 0 }}>
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

        <p className="text-center text-muted-foreground pt-2" style={{ fontSize: 12 }}>
          Alterações de configuração requerem deploy de código.
        </p>
      </main>
    </div>
  );
}

function ConfigSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className="text-primary">{icon}</span>
        <h2 className="font-bold m-0" style={{ fontFamily: '"Archivo", sans-serif', fontSize: 16 }}>{title}</h2>
      </div>
      <div className="bg-muted border border-border rounded-xl overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function ConfigRow({ label, value, highlight, isUrl, isEmail }: {
  label: string; value: string; highlight?: boolean; isUrl?: boolean; isEmail?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6 py-4 px-5 border-b border-border">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      {isUrl ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary no-underline" style={{ wordBreak: "break-all" }}>
          {value}
        </a>
      ) : isEmail ? (
        <a href={`mailto:${value}`} className="text-sm font-medium text-primary no-underline">
          {value}
        </a>
      ) : (
        <span className={`text-sm text-right ${highlight ? "font-bold text-primary" : "font-medium text-foreground"}`}>
          {value}
        </span>
      )}
    </div>
  );
}
