"use client";

import { useState } from "react";
import Link from "next/link";
import { VozWordmark } from "@/components/voz/wordmark";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { FREE_EVENT_LIMIT, FREE_QUESTION_LIMIT, EVENT_PRICE_CENTS } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PlanosPage() {
  const [subscribing, setSubscribing] = useState(false);

  async function subscribePro() {
    setSubscribing(true);
    try {
      const res = await fetch("/api/v1/stripe/subscription", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/entrar?redirect_url=/planos";
        return;
      }
      if (!res.ok) {
        toast.error("Não foi possível iniciar a assinatura. Tente novamente.");
        return;
      }
      const { checkoutUrl } = (await res.json()) as { checkoutUrl: string | null };
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        toast.error("Não foi possível iniciar a assinatura.");
      }
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <div className="bg-background text-foreground" style={{ minHeight: "100dvh" }}>
      <header className="flex items-center gap-2.5 border-b border-border px-4 sticky top-0 bg-background z-10" style={{ height: 56 }}>
        <VozWordmark size={20} />
        <div className="flex-1" />
        <Link href="/conta" className="text-[13px] font-medium text-muted-foreground no-underline">
          Minha conta
        </Link>
      </header>

      <main className="mx-auto px-4 py-10 flex flex-col gap-8" style={{ maxWidth: 960 }}>
        <div className="text-center">
          <h1 className="font-bold m-0" style={{ fontFamily: '"Archivo", sans-serif', fontSize: "clamp(24px, 5vw, 32px)" }}>
            Planos
          </h1>
          <p className="text-muted-foreground mt-2" style={{ fontSize: 14 }}>
            Escolha como cobrar seus eventos. Pague só quando precisar, ou assine e tenha eventos ilimitados.
          </p>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <PlanCard
            title="Gratuito"
            price="R$ 0"
            cadence="para sempre"
            features={[
              `${FREE_EVENT_LIMIT} evento`,
              `Até ${FREE_QUESTION_LIMIT} perguntas por evento`,
              "QR code e painel de moderação",
              "Modo apresentação",
            ]}
          />
          <PlanCard
            title="Por evento"
            price={brl(EVENT_PRICE_CENTS)}
            cadence="pagamento único por evento"
            features={[
              "Perguntas ilimitadas naquele evento",
              "Sem assinatura mensal",
              "Pague só quando realizar um evento",
              "Todos os recursos do painel",
            ]}
          />
          <PlanCard
            title="Pro"
            price="R$ 199,90"
            cadence="por mês"
            highlight
            features={[
              "Eventos ilimitados",
              "Perguntas ilimitadas em todos os eventos",
              "Sem pagamento avulso",
              "Cancele quando quiser",
            ]}
            cta={
              <button
                onClick={subscribePro}
                disabled={subscribing}
                className="w-full inline-flex items-center justify-center rounded-[10px] border-0 bg-primary text-primary-foreground text-sm font-semibold"
                style={{ height: 46, cursor: subscribing ? "not-allowed" : "pointer", opacity: subscribing ? 0.7 : 1 }}
              >
                {subscribing ? "Redirecionando…" : "Assinar Pro"}
              </button>
            }
          />
        </div>

        <p className="text-center text-muted-foreground" style={{ fontSize: 12 }}>
          Pagamentos processados com segurança pela Stripe. Você pode gerenciar ou cancelar a assinatura a qualquer momento na sua conta.
        </p>
      </main>
    </div>
  );
}

function PlanCard({
  title,
  price,
  cadence,
  features,
  highlight,
  cta,
}: {
  title: string;
  price: string;
  cadence: string;
  features: string[];
  highlight?: boolean;
  cta?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-5 rounded-2xl border p-6 ${highlight ? "bg-primary/5 border-primary/30" : "bg-muted border-border"}`}
    >
      <div>
        <p className={`font-bold m-0 ${highlight ? "text-primary" : "text-foreground"}`} style={{ fontFamily: '"Archivo", sans-serif', fontSize: 18 }}>
          {title}
        </p>
        <p className="font-bold m-0 mt-2" style={{ fontFamily: '"Archivo", sans-serif', fontSize: 28 }}>
          {price}
        </p>
        <p className="text-muted-foreground m-0" style={{ fontSize: 12 }}>{cadence}</p>
      </div>
      <ul className="flex flex-col gap-2.5 m-0 p-0" style={{ listStyle: "none" }}>
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px]">
            <Check size={16} className="text-primary shrink-0 mt-0.5" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="flex-1" />
      {cta}
    </div>
  );
}
