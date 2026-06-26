"use client";

import { Suspense, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { VozWordmark } from "@/components/voz/wordmark";
import { AlertCircle, CheckCircle2 } from "lucide-react";

function EntrarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "1";
  const [email, setEmail] = useState("");
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
      const params = new URLSearchParams(window.location.search);
      const callbackUrl = params.get("callbackUrl");
      if (callbackUrl?.startsWith("/")) {
        router.push(callbackUrl);
        return;
      }
      const session = await getSession();
      const role = session?.user?.role;
      if (role === "superadmin") router.push("/plataforma");
      else if (role === "admin") router.push("/admin/eventos");
      else if (role === "owner") router.push("/dashboard");
      else router.push("/mediador");
    }
  }

  return (
    <>
      <div className="lo-root">
        {/* Mobile: compact top bar */}
        <div className="lo-topbar">
          <VozWordmark size={24} inverse />
        </div>

        {/* Side-by-side on desktop */}
        <div className="lo-layout">
          {/* Brand panel — desktop only */}
          <aside className="lo-brand" aria-hidden="true">
            <VozWordmark size={28} inverse />
            <div style={{ flex: 1 }} />
            <div>
              <p className="lo-hero">
                Pergunte<span className="lo-dot">.</span><br />
                Ouça<span className="lo-dot">.</span><br />
                Conecte<span className="lo-dot">.</span>
              </p>
              <p className="lo-sub">
                Painel do mediador. Receba perguntas da plateia em tempo real e decida quais vão ao palco.
              </p>
            </div>
            <p className="lo-version">v1.0 · INCLUIR 2025</p>
            <div className="lo-stripe" aria-hidden="true" />
          </aside>

          {/* Form panel */}
          <div className="lo-form-wrap">
            <form onSubmit={submit} className="lo-form" noValidate>
              <div>
                <h1 className="lo-title">Entrar</h1>
                <p className="lo-caption">Para mediadores e administradores.</p>
              </div>

              {registered && (
                <div role="status" className="lo-success">
                  <CheckCircle2 size={16} aria-hidden /> Conta criada com sucesso! Faça login.
                </div>
              )}

              {error && (
                <div role="alert" className="lo-error">
                  <AlertCircle size={16} aria-hidden /> {error}
                </div>
              )}

              <div className="lo-field">
                <label htmlFor="lo-email">Email</label>
                <input
                  id="lo-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="lo-field">
                <label htmlFor="lo-pass">Senha</label>
                <input
                  id="lo-pass"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" disabled={busy} className="lo-btn">
                {busy ? "Entrando…" : "Entrar"}
              </button>

              <p className="lo-hint">
                Sem cadastro público. Peça acesso ao organizador do evento.
              </p>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .lo-root {
          min-height: 100dvh;
          background: hsl(268 45% 14%);
          display: flex;
          flex-direction: column;
        }

        /* Mobile top bar */
        .lo-topbar {
          display: flex;
          align-items: center;
          padding: 20px 24px 0;
        }

        .lo-layout {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        /* Desktop brand panel — hidden on mobile */
        .lo-brand {
          display: none;
        }

        /* Form wrapper */
        .lo-form-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px 20px 48px;
        }

        .lo-form {
          width: 100%;
          max-width: 420px;
          background: hsl(var(--background));
          border-radius: 20px;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: 0 24px 64px rgba(0,0,0,.35);
        }

        .lo-title {
          font-family: "Archivo", sans-serif;
          font-weight: 700;
          font-size: 28px;
          margin: 0 0 4px;
          color: hsl(var(--foreground));
        }

        .lo-caption {
          font-size: 15px;
          color: hsl(var(--muted-foreground));
          margin: 0;
        }

        .lo-success {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: hsl(142 71% 45% / .12);
          border-radius: 10px;
          color: hsl(142 71% 32%);
          font-size: 14px;
        }

        .lo-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: hsl(var(--destructive) / .08);
          border-radius: 10px;
          color: hsl(var(--destructive));
          font-size: 14px;
        }

        .lo-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .lo-field label {
          font-size: 14px;
          font-weight: 500;
          color: hsl(var(--foreground));
        }

        .lo-field input {
          padding: 13px 16px;
          border-radius: 10px;
          border: 1.5px solid hsl(var(--border));
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
          font-size: 16px;
          font-family: inherit;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }

        .lo-field input:focus {
          border-color: hsl(var(--primary));
        }

        .lo-btn {
          height: 52px;
          border-radius: 12px;
          border: none;
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          font-size: 16px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .lo-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .lo-hint {
          text-align: center;
          font-size: 13px;
          color: hsl(var(--muted-foreground));
          margin: 0;
          line-height: 1.5;
        }

        /* ─── Desktop (≥ 768px) ─── */
        @media (min-width: 768px) {
          .lo-root {
            background: hsl(var(--background));
          }

          .lo-topbar {
            display: none;
          }

          .lo-layout {
            flex-direction: row;
            height: 100dvh;
          }

          .lo-brand {
            display: flex;
            flex-direction: column;
            flex: 1;
            padding: 56px 64px;
            background: hsl(268 45% 18%);
            color: #fff;
            position: relative;
            overflow: hidden;
          }

          .lo-hero {
            font-family: "Archivo Black", sans-serif;
            font-size: clamp(44px, 4.5vw, 76px);
            font-weight: 900;
            line-height: 0.95;
            letter-spacing: -0.03em;
            color: #fff;
            margin: 0 0 20px;
          }

          .lo-dot {
            color: hsl(44 92% 58%);
          }

          .lo-sub {
            font-size: 17px;
            color: rgba(255,255,255,.72);
            line-height: 1.55;
            max-width: 440px;
            margin: 0;
          }

          .lo-version {
            font-size: 12px;
            color: rgba(255,255,255,.45);
            margin: 0;
          }

          .lo-stripe {
            position: absolute;
            right: -80px;
            top: 220px;
            width: 260px;
            height: 8px;
            background: hsl(44 92% 58%);
            transform: rotate(-28deg);
          }

          .lo-form-wrap {
            flex: 1;
            background: hsl(var(--background));
            padding: 64px;
          }

          .lo-form {
            box-shadow: none;
            padding: 0;
            max-width: 400px;
          }
        }
      `}</style>
    </>
  );
}

export default function EntrarPage() {
  return (
    <Suspense>
      <EntrarForm />
    </Suspense>
  );
}
