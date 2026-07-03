"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useAppUser } from "@/lib/use-app-user";
import { VozWordmark } from "@/components/voz/wordmark";
import { HeaderControls } from "@/components/voz/header-controls";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";

export default function ContaPage() {
  const { signOut } = useClerk();
  const { name, email, plan } = useAppUser();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const userName = name ?? "—";
  const userEmail = email ?? "—";
  const isPaid = plan === "paid";

  async function handleExport() {
    setExportBusy(true);
    try {
      const res = await fetch("/api/v1/me/data-export");
      if (!res.ok) throw new Error("Falha ao exportar dados");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "meus-dados-voz.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Dados exportados com sucesso.");
    } catch {
      toast.error("Erro ao exportar dados. Tente novamente.");
    } finally {
      setExportBusy(false);
    }
  }

  async function handleDeleteConfirmed() {
    setDeleteBusy(true);
    try {
      const res = await fetch("/api/v1/me/data", { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao remover dados");
      await signOut({ redirectUrl: "/" });
    } catch {
      toast.error("Erro ao remover dados. Tente novamente.");
      setDeleteBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="bg-background text-foreground" style={{ minHeight: "100dvh" }}>
      <header className="flex items-center gap-4 border-b border-border px-6" style={{ height: 56 }}>
        <VozWordmark size={22} />
        <nav className="flex gap-1" aria-label="Dashboard">
          <NavLink href="/dashboard">Eventos</NavLink>
          <NavLink href="/dashboard/conta" active>Conta</NavLink>
        </nav>
        <div className="flex-1" />
        <div className="bg-border" style={{ width: 1, height: 24 }} aria-hidden />
        <HeaderControls />
      </header>

      <main className="mx-auto py-10 px-6 flex flex-col gap-8" style={{ maxWidth: 720 }}>

        {/* Section: Info da conta */}
        <section aria-labelledby="section-conta">
          <h1 id="section-conta" className="font-bold text-[28px] mb-5" style={{ fontFamily: '"Archivo", sans-serif' }}>
            Minha Conta
          </h1>
          <div className="bg-muted border border-border rounded-xl p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase" style={{ letterSpacing: "0.06em" }}>Nome</span>
              <span className="text-base font-medium">{userName}</span>
            </div>
            <div className="bg-border" style={{ height: 1 }} aria-hidden />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase" style={{ letterSpacing: "0.06em" }}>Email</span>
              <span className="text-base font-medium">{userEmail}</span>
            </div>
            <div className="bg-border" style={{ height: 1 }} aria-hidden />
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase" style={{ letterSpacing: "0.06em" }}>Plano</span>
              </div>
              <span
                className="rounded-full py-1 px-3 text-[13px] font-semibold border"
                style={{
                  background: isPaid ? "hsl(var(--primary) / .12)" : "hsl(var(--muted-foreground) / .12)",
                  color: isPaid ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  borderColor: isPaid ? "hsl(var(--primary) / .25)" : "hsl(var(--border))",
                }}
              >
                {isPaid ? "Plano Pago" : "Plano Gratuito"}
              </span>
            </div>
          </div>
        </section>

        {/* Section: Zona de Privacidade */}
        <section aria-labelledby="section-lgpd">
          <div className="mb-5">
            <h2 id="section-lgpd" className="font-bold text-[22px] mb-1.5" style={{ fontFamily: '"Archivo", sans-serif' }}>
              Seus Dados
            </h2>
            <p className="text-sm text-muted-foreground m-0">
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD).
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Card: Exportar */}
            <div className="bg-muted border border-border rounded-xl p-6 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-[15px]">Exportar meus dados</span>
                <span className="text-[13px] text-muted-foreground">
                  Baixe uma cópia completa de todos os seus dados em formato JSON.
                </span>
              </div>
              <button
                onClick={handleExport}
                disabled={exportBusy}
                className="inline-flex items-center gap-2 px-4 border border-border bg-background text-foreground text-sm font-semibold font-[inherit] shrink-0"
                style={{
                  height: 40,
                  borderRadius: 10,
                  cursor: exportBusy ? "not-allowed" : "pointer",
                  opacity: exportBusy ? 0.65 : 1,
                }}
              >
                <Download size={14} aria-hidden />
                {exportBusy ? "Exportando…" : "Baixar meus dados (JSON)"}
              </button>
            </div>

            {/* Card: Remover */}
            <div className="bg-muted border border-border rounded-xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-[15px]">Remover meus dados</span>
                  <span className="text-[13px] text-muted-foreground">
                    Remove permanentemente sua conta e todos os dados associados.
                  </span>
                </div>
                {!confirmDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-2 px-4 border text-destructive text-sm font-semibold font-[inherit] cursor-pointer shrink-0"
                    style={{
                      height: 40,
                      borderRadius: 10,
                      borderColor: "hsl(var(--destructive) / .4)",
                      background: "hsl(var(--destructive) / .08)",
                    }}
                  >
                    <Trash2 size={14} aria-hidden />
                    Remover meus dados
                  </button>
                )}
              </div>

              {confirmDelete && (
                <div
                  role="alert"
                  className="p-5 flex flex-col gap-4 border"
                  style={{
                    borderRadius: 10,
                    background: "hsl(var(--destructive) / .06)",
                    borderColor: "hsl(var(--destructive) / .25)",
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-[15px] text-destructive">
                      Tem certeza?
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      Esta ação é irreversível. Sua conta e todos os dados associados serão removidos permanentemente.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteConfirmed}
                      disabled={deleteBusy}
                      className="px-4 rounded-lg border-0 bg-destructive text-white text-sm font-bold font-[inherit]"
                      style={{
                        height: 38,
                        cursor: deleteBusy ? "not-allowed" : "pointer",
                        opacity: deleteBusy ? 0.65 : 1,
                      }}
                    >
                      {deleteBusy ? "Removendo…" : "Sim, remover minha conta"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleteBusy}
                      className="px-4 rounded-lg border border-border bg-transparent text-foreground text-sm font-semibold font-[inherit]"
                      style={{
                        height: 38,
                        cursor: deleteBusy ? "not-allowed" : "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section: Informações LGPD */}
        <section aria-labelledby="section-lgpd-info">
          <h2 id="section-lgpd-info" className="font-bold text-lg mb-4" style={{ fontFamily: '"Archivo", sans-serif' }}>
            Informações sobre privacidade
          </h2>
          <div className="bg-muted border border-border rounded-xl p-6 flex flex-col gap-3">
            <InfoLine label="Dados coletados" value="Nome, e-mail, dados dos eventos e perguntas." />
            <div className="bg-border" style={{ height: 1 }} aria-hidden />
            <InfoLine label="Retenção" value="Dados de participantes são anonimizados 90 dias após o evento." />
            <div className="bg-border" style={{ height: 1 }} aria-hidden />
            <InfoLine label="DPO / Contato de privacidade" value="privacidade@voz.app" isEmail />
            <div className="bg-border" style={{ height: 1 }} aria-hidden />
            <p className="text-[13px] text-muted-foreground m-0" style={{ lineHeight: 1.6 }}>
              Para dúvidas sobre seus dados, envie e-mail para{" "}
              <a href="mailto:privacidade@voz.app" className="text-primary no-underline font-medium">
                privacidade@voz.app
              </a>
              .
            </p>
          </div>
        </section>

      </main>
    </div>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`py-1.5 px-3 rounded-lg text-sm font-medium no-underline ${active ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground"}`}
    >
      {children}
    </Link>
  );
}

function InfoLine({ label, value, isEmail }: { label: string; value: string; isEmail?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold text-muted-foreground uppercase" style={{ letterSpacing: "0.06em" }}>
        {label}
      </span>
      {isEmail ? (
        <a href={`mailto:${value}`} className="text-sm text-primary no-underline font-medium">
          {value}
        </a>
      ) : (
        <span className="text-sm">{value}</span>
      )}
    </div>
  );
}
