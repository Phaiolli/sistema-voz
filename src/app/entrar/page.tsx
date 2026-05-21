"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { VozWordmark } from "@/components/voz/wordmark";
import { AlertCircle } from "lucide-react";

export default function EntrarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("leonardo@incluir.org");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError("Email ou senha incorretos.");
    } else {
      router.push("/mediador");
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid hsl(var(--border))",
    background: "hsl(var(--muted))", color: "hsl(var(--foreground))", fontSize: 16, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      {/* Left brand panel */}
      <div style={{ flex: 1, padding: 64, background: "hsl(190 47% 22%)", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
        <VozWordmark size={32} inverse />
        <div>
          <p style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: "clamp(48px, 5vw, 80px)", color: "#fff", lineHeight: 0.95, letterSpacing: "-0.03em", margin: "0 0 24px" }}>
            Pergunte<span style={{ color: "hsl(38 85% 58%)" }}>.</span><br />
            Ouça<span style={{ color: "hsl(38 85% 58%)" }}>.</span><br />
            Conecte<span style={{ color: "hsl(38 85% 58%)" }}>.</span>
          </p>
          <p style={{ color: "rgba(255,255,255,.75)", fontSize: 18, lineHeight: 1.5, maxWidth: 460, margin: 0 }}>
            Painel do mediador. Aqui você recebe as perguntas da plateia em tempo real e decide quais vão ao palco.
          </p>
        </div>
        <div style={{ display: "flex", gap: 32, color: "rgba(255,255,255,.65)", fontSize: 13 }}>
          <span>v1.0 · INCLUIR 2025</span>
        </div>
        <div style={{ position: "absolute", right: -100, top: 200, width: 280, height: 8, background: "hsl(38 85% 58%)", transform: "rotate(-30deg)" }} aria-hidden />
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 64 }}>
        <form onSubmit={submit} style={{ width: 380, display: "flex", flexDirection: "column", gap: 22 }} noValidate>
          <div>
            <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 32, margin: "0 0 4px" }}>Entrar</h1>
            <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 16, margin: 0 }}>Para mediadores e administradores.</p>
          </div>

          {error && (
            <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "hsl(var(--destructive) / .08)", borderRadius: 8, color: "hsl(var(--destructive))", fontSize: 14 }}>
              <AlertCircle size={16} aria-hidden /> {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="lo-email" style={{ fontSize: 14, fontWeight: 500 }}>Email</label>
            <input id="lo-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inp} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="lo-pass" style={{ fontSize: 14, fontWeight: 500 }}>Senha</label>
            <input id="lo-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inp} />
          </div>

          <button type="submit" disabled={busy} style={{ height: 52, borderRadius: 10, border: "none", cursor: busy ? "not-allowed" : "pointer", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 16, fontWeight: 700, opacity: busy ? 0.7 : 1 }}>
            {busy ? "Entrando…" : "Entrar"}
          </button>

          <p style={{ textAlign: "center", fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0 }}>
            Sem cadastro público. Peça acesso ao organizador do evento.
          </p>
        </form>
      </div>
    </div>
  );
}
