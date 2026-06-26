"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";
import { toast } from "sonner";
import type { Event } from "@/lib/types";
import { FREE_EVENT_LIMIT } from "@/lib/plan-limits";

export default function NovoEventoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [atLimit, setAtLimit] = useState(false);

  useEffect(() => {
    fetch("/api/v1/events")
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao verificar eventos");
        return r.json();
      })
      .then((data: { events: Event[] }) => {
        if (data.events.length >= FREE_EVENT_LIMIT) {
          setAtLimit(true);
        } else {
          router.replace("/admin/eventos/novo");
        }
      })
      .catch(() => {
        toast.error("Erro ao verificar plano. Tente novamente.");
        router.replace("/dashboard");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleCheckout() {
    setCheckingOut(true);
    try {
      const res = await fetch("/api/v1/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventData: {
            name: "Novo Evento",
            slug: `novo-evento-${Date.now()}`,
            status: "draft",
          },
        }),
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: { message?: string } };
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error?.message ?? "Erro ao criar checkout.");
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar pagamento.");
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-background" style={{ minHeight: "100dvh" }}>
        <Loader2 size={24} className="text-muted-foreground" style={{ animation: "spin 1s linear infinite" }} aria-label="Carregando" />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!atLimit) return null;

  return (
    <div className="bg-background text-foreground" style={{ minHeight: "100dvh" }}>
      <header className="flex items-center gap-4 border-b border-border px-6" style={{ height: 56 }}>
        <VozWordmark size={22} />
        <div className="flex-1" />
        <Link href="/dashboard" className="text-[13px] text-muted-foreground no-underline">
          Voltar ao painel
        </Link>
      </header>

      <main className="mx-auto py-16 px-6" style={{ maxWidth: 480 }}>
        <div className="text-center mb-8">
          <p className="text-[13px] font-semibold text-muted-foreground uppercase mb-3" style={{ letterSpacing: "0.08em" }}>
            Plano gratuito
          </p>
          <h1 className="font-bold text-[28px] mb-3" style={{ fontFamily: '"Archivo", sans-serif' }}>
            Você atingiu o limite do plano gratuito
          </h1>
          <p className="text-[15px] text-muted-foreground m-0">
            O plano gratuito permite 1 evento. Para criar mais, adquira eventos adicionais.
          </p>
        </div>

        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="border-b border-border bg-muted" style={{ padding: "24px 24px 20px" }}>
            <p className="text-[13px] font-semibold text-muted-foreground mb-1">Por evento adicional</p>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-4xl" style={{ fontFamily: '"Archivo", sans-serif' }}>R$&nbsp;59,90</span>
            </div>
          </div>

          <div style={{ padding: "20px 24px 24px" }}>
            <ul className="list-none mb-6 p-0 flex flex-col gap-2.5">
              {[
                "Evento sem limite de perguntas",
                "Painel de moderação completo",
                "Exportação de perguntas em CSV",
                "QR code para participantes",
                "Suporte por e-mail",
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 size={16} className="text-success shrink-0" aria-hidden />
                  {benefit}
                </li>
              ))}
            </ul>

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full border-0 bg-primary text-primary-foreground text-[15px] font-semibold flex items-center justify-center gap-2"
              style={{ height: 44, borderRadius: 10, cursor: checkingOut ? "not-allowed" : "pointer", opacity: checkingOut ? 0.7 : 1 }}
            >
              {checkingOut ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} aria-hidden />
                  Aguarde…
                </>
              ) : (
                "Ir para o checkout"
              )}
            </button>
          </div>
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
