"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { VozWordmark } from "@/components/voz/wordmark";
import { HeaderControls } from "@/components/voz/header-controls";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";

export default function ContaPage() {
  const { data: session } = useSession();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const userName = session?.user?.name ?? "—";
  const userEmail = session?.user?.email ?? "—";
  const isPaid = (session?.user as { plan?: string } | undefined)?.plan === "paid";

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
      await signOut({ callbackUrl: "/" });
    } catch {
      toast.error("Erro ao remover dados. Tente novamente.");
      setDeleteBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 24px", gap: 16 }}>
        <VozWordmark size={22} />
        <nav style={{ display: "flex", gap: 4 }} aria-label="Dashboard">
          <NavLink href="/dashboard">Eventos</NavLink>
          <NavLink href="/dashboard/conta" active>Conta</NavLink>
        </nav>
        <div style={{ flex: 1 }} />
        <div style={{ width: 1, height: 24, background: "hsl(var(--border))" }} aria-hidden />
        <HeaderControls />
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* Section: Info da conta */}
        <section aria-labelledby="section-conta">
          <h1 id="section-conta" style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 28, margin: "0 0 20px" }}>
            Minha Conta
          </h1>
          <div style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.06em" }}>Nome</span>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{userName}</span>
            </div>
            <div style={{ height: 1, background: "hsl(var(--border))" }} aria-hidden />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</span>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{userEmail}</span>
            </div>
            <div style={{ height: 1, background: "hsl(var(--border))" }} aria-hidden />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.06em" }}>Plano</span>
              </div>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  background: isPaid ? "hsl(var(--primary) / .12)" : "hsl(var(--muted-foreground) / .12)",
                  color: isPaid ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  border: isPaid ? "1px solid hsl(var(--primary) / .25)" : "1px solid hsl(var(--border))",
                }}
              >
                {isPaid ? "Plano Pago" : "Plano Gratuito"}
              </span>
            </div>
          </div>
        </section>

        {/* Section: Zona de Privacidade */}
        <section aria-labelledby="section-lgpd">
          <div style={{ marginBottom: 20 }}>
            <h2 id="section-lgpd" style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: "0 0 6px" }}>
              Seus Dados
            </h2>
            <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", margin: 0 }}>
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD).
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Card: Exportar */}
            <div style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>Exportar meus dados</span>
                <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
                  Baixe uma cópia completa de todos os seus dados em formato JSON.
                </span>
              </div>
              <button
                onClick={handleExport}
                disabled={exportBusy}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 10,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: exportBusy ? "not-allowed" : "pointer",
                  opacity: exportBusy ? 0.65 : 1,
                  flexShrink: 0,
                }}
              >
                <Download size={14} aria-hidden />
                {exportBusy ? "Exportando…" : "Baixar meus dados (JSON)"}
              </button>
            </div>

            {/* Card: Remover */}
            <div style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>Remover meus dados</span>
                  <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
                    Remove permanentemente sua conta e todos os dados associados.
                  </span>
                </div>
                {!confirmDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      height: 40,
                      padding: "0 16px",
                      borderRadius: 10,
                      border: "1px solid hsl(var(--destructive) / .4)",
                      background: "hsl(var(--destructive) / .08)",
                      color: "hsl(var(--destructive))",
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      flexShrink: 0,
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
                  style={{
                    padding: 20,
                    borderRadius: 10,
                    background: "hsl(var(--destructive) / .06)",
                    border: "1px solid hsl(var(--destructive) / .25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "hsl(var(--destructive))" }}>
                      Tem certeza?
                    </span>
                    <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
                      Esta ação é irreversível. Sua conta e todos os dados associados serão removidos permanentemente.
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleDeleteConfirmed}
                      disabled={deleteBusy}
                      style={{
                        height: 38,
                        padding: "0 16px",
                        borderRadius: 8,
                        border: "none",
                        background: "hsl(var(--destructive))",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 700,
                        fontFamily: "inherit",
                        cursor: deleteBusy ? "not-allowed" : "pointer",
                        opacity: deleteBusy ? 0.65 : 1,
                      }}
                    >
                      {deleteBusy ? "Removendo…" : "Sim, remover minha conta"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleteBusy}
                      style={{
                        height: 38,
                        padding: "0 16px",
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        background: "transparent",
                        color: "hsl(var(--foreground))",
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "inherit",
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
          <h2 id="section-lgpd-info" style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 18, margin: "0 0 16px" }}>
            Informações sobre privacidade
          </h2>
          <div style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <InfoLine label="Dados coletados" value="Nome, e-mail, dados dos eventos e perguntas." />
            <div style={{ height: 1, background: "hsl(var(--border))" }} aria-hidden />
            <InfoLine label="Retenção" value="Dados de participantes são anonimizados 90 dias após o evento." />
            <div style={{ height: 1, background: "hsl(var(--border))" }} aria-hidden />
            <InfoLine label="DPO / Contato de privacidade" value="privacidade@voz.app" isEmail />
            <div style={{ height: 1, background: "hsl(var(--border))" }} aria-hidden />
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.6 }}>
              Para dúvidas sobre seus dados, envie e-mail para{" "}
              <a href="mailto:privacidade@voz.app" style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 500 }}>
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
      style={{
        padding: "6px 12px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500,
        textDecoration: "none",
        background: active ? "hsl(var(--muted))" : "transparent",
        color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
      }}
    >
      {children}
    </Link>
  );
}

function InfoLine({ label, value, isEmail }: { label: string; value: string; isEmail?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      {isEmail ? (
        <a href={`mailto:${value}`} style={{ fontSize: 14, color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 500 }}>
          {value}
        </a>
      ) : (
        <span style={{ fontSize: 14 }}>{value}</span>
      )}
    </div>
  );
}
