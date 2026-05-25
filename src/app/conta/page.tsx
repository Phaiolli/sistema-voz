"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { VozWordmark } from "@/components/voz/wordmark";
import { EnvSwitcher } from "@/components/voz/env-switcher";
import { toast } from "sonner";
import { LogOut, KeyRound, User } from "lucide-react";

export const dynamic = "force-dynamic";

const inp: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1.5px solid hsl(var(--border))",
  background: "hsl(var(--background))",
  color: "hsl(var(--foreground))",
  fontSize: 14,
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
  minHeight: 44,
};

function initials(name: string | null | undefined, email: string | null | undefined) {
  if (name) return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return email?.[0]?.toUpperCase() ?? "?";
}

function roleLabel(role: string | undefined) {
  if (role === "superadmin") return "Super Admin";
  if (role === "admin") return "Administrador";
  if (role === "mediador") return "Moderador";
  if (role === "owner") return "Proprietário";
  return role ?? "—";
}

export default function ContaPage() {
  const { data: session, update } = useSession();
  const u = session?.user as { id?: string; name?: string | null; email?: string | null; role?: string } | undefined;

  const [name, setName] = useState(u?.name ?? "");
  const [savingName, setSavingName] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!u?.id || !name.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/v1/me/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        toast.error(err.message ?? "Erro ao salvar nome.");
        return;
      }
      await update({ name: name.trim() });
      toast.success("Nome atualizado.");
    } catch {
      toast.error("Erro ao salvar nome.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleSavePwd(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) { toast.error("As senhas não coincidem."); return; }
    if (newPwd.length < 8) { toast.error("A senha deve ter pelo menos 8 caracteres."); return; }
    setSavingPwd(true);
    try {
      const res = await fetch(`/api/v1/me/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, password: newPwd }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        toast.error(err.message ?? "Erro ao alterar senha.");
        return;
      }
      toast.success("Senha alterada com sucesso.");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch {
      toast.error("Erro ao alterar senha.");
    } finally {
      setSavingPwd(false);
    }
  }

  const abbr = initials(u?.name, u?.email);

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))", paddingBottom: 88 }}>
      {/* Header */}
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, position: "sticky", top: 0, background: "hsl(var(--background))", zIndex: 10 }}>
        <VozWordmark size={20} />
        <EnvSwitcher active="admin" />
        <div style={{ flex: 1 }} />
        <button
          onClick={() => signOut({ callbackUrl: "/entrar" })}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 44, padding: "0 14px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 13, cursor: "pointer", color: "hsl(var(--foreground))" }}
        >
          <LogOut size={14} aria-hidden />
          <span className="conta-logout-lbl">Sair</span>
        </button>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
        <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: "clamp(22px, 5vw, 28px)", margin: 0 }}>Minha conta</h1>

        {/* Avatar + info */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 20, background: "hsl(var(--muted))", borderRadius: 12, border: "1px solid hsl(var(--border))" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
            {abbr}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: 16, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u?.name ?? "—"}</p>
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u?.email ?? "—"}</p>
            <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "hsl(var(--primary) / .12)", color: "hsl(var(--primary))" }}>
              {roleLabel(u?.role)}
            </span>
          </div>
        </div>

        {/* Editar nome */}
        <Section icon={<User size={16} />} title="Dados pessoais">
          <form onSubmit={handleSaveName} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FormField label="Nome" htmlFor="c-name">
              <input
                id="c-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inp}
              />
            </FormField>
            <FormField label="E-mail" htmlFor="c-email">
              <input id="c-email" value={u?.email ?? ""} readOnly style={{ ...inp, color: "hsl(var(--muted-foreground))" }} />
            </FormField>
            <div>
              <button
                type="submit"
                disabled={savingName}
                style={{ height: 44, padding: "0 20px", borderRadius: 9, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 14, fontWeight: 600, cursor: savingName ? "not-allowed" : "pointer", opacity: savingName ? 0.7 : 1 }}
              >
                {savingName ? "Salvando…" : "Salvar nome"}
              </button>
            </div>
          </form>
        </Section>

        {/* Alterar senha */}
        <Section icon={<KeyRound size={16} />} title="Alterar senha">
          <form onSubmit={handleSavePwd} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FormField label="Senha atual" htmlFor="c-curr-pwd">
              <input id="c-curr-pwd" type="password" required value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} style={inp} />
            </FormField>
            <FormField label="Nova senha" htmlFor="c-new-pwd">
              <input id="c-new-pwd" type="password" required minLength={8} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} style={inp} />
            </FormField>
            <FormField label="Confirmar nova senha" htmlFor="c-confirm-pwd">
              <input id="c-confirm-pwd" type="password" required minLength={8} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} style={inp} />
            </FormField>
            <div>
              <button
                type="submit"
                disabled={savingPwd}
                style={{ height: 44, padding: "0 20px", borderRadius: 9, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 14, fontWeight: 600, cursor: savingPwd ? "not-allowed" : "pointer", opacity: savingPwd ? 0.7 : 1 }}
              >
                {savingPwd ? "Salvando…" : "Alterar senha"}
              </button>
            </div>
          </form>
        </Section>

        {/* Sair */}
        <div style={{ paddingTop: 8 }}>
          <button
            onClick={() => signOut({ callbackUrl: "/entrar" })}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 20px", borderRadius: 9, border: "1px solid hsl(var(--destructive) / .4)", background: "transparent", fontSize: 14, cursor: "pointer", color: "hsl(var(--destructive))", fontWeight: 500 }}
          >
            <LogOut size={15} aria-hidden />
            Sair da conta
          </button>
        </div>
      </main>

      <style>{`
        .conta-logout-lbl { display: inline; }
        @media (max-width: 639px) { .conta-logout-lbl { display: none; } }
      `}</style>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 20, background: "hsl(var(--muted))", borderRadius: 12, border: "1px solid hsl(var(--border))", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "hsl(var(--primary))" }}>{icon}</span>
        <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 15, margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 13, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}
