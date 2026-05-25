"use client";

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
      <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} style={{ color: "hsl(var(--muted-foreground))", animation: "spin 1s linear infinite" }} aria-label="Carregando" />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!atLimit) return null;

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 24px", gap: 16 }}>
        <VozWordmark size={22} />
        <div style={{ flex: 1 }} />
        <Link href="/dashboard" style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", textDecoration: "none" }}>
          Voltar ao painel
        </Link>
      </header>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>
            Plano gratuito
          </p>
          <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 28, margin: "0 0 12px" }}>
            Você atingiu o limite do plano gratuito
          </h1>
          <p style={{ fontSize: 15, color: "hsl(var(--muted-foreground))", margin: 0 }}>
            O plano gratuito permite 1 evento. Para criar mais, adquira eventos adicionais.
          </p>
        </div>

        <div style={{ borderRadius: 16, border: "1px solid hsl(var(--border))", overflow: "hidden" }}>
          <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--muted))" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--muted-foreground))", margin: "0 0 4px" }}>Por evento adicional</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 36 }}>R$&nbsp;59,90</span>
            </div>
          </div>

          <div style={{ padding: "20px 24px 24px" }}>
            <ul style={{ listStyle: "none", margin: "0 0 24px", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Evento sem limite de perguntas",
                "Painel de moderação completo",
                "Exportação de perguntas em CSV",
                "QR code para participantes",
                "Suporte por e-mail",
              ].map((benefit) => (
                <li key={benefit} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                  <CheckCircle2 size={16} style={{ color: "hsl(var(--success))", flexShrink: 0 }} aria-hidden />
                  {benefit}
                </li>
              ))}
            </ul>

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              style={{ width: "100%", height: 44, borderRadius: 10, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 15, fontWeight: 600, cursor: checkingOut ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: checkingOut ? 0.7 : 1 }}
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
