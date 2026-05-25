"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VozWordmark } from "@/components/voz/wordmark";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface FormState {
  name: string;
  email: string;
  password: string;
  lgpdAccepted: boolean;
}

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    lgpdAccepted: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.status === 201) {
        router.push("/entrar?registered=1");
        return;
      }

      if (res.status === 422) {
        const data = (await res.json()) as { message?: string; errors?: Record<string, string[]> };
        const firstError =
          data.message ??
          Object.values(data.errors ?? {}).flat()[0] ??
          "Dados inválidos.";
        setError(firstError);
        return;
      }

      setError("Erro ao criar conta. Tente novamente.");
    } catch {
      setError("Erro de conexão. Verifique sua internet.");
    } finally {
      setBusy(false);
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
                Crie<span className="lo-dot">.</span><br />
                Gerencie<span className="lo-dot">.</span><br />
                Engaje<span className="lo-dot">.</span>
              </p>
              <p className="lo-sub">
                Crie sua conta de organizador e comece a gerenciar eventos com Q&amp;A ao vivo em minutos.
              </p>
            </div>
            <p className="lo-version">v1.0 · INCLUIR 2025</p>
            <div className="lo-stripe" aria-hidden="true" />
          </aside>

          {/* Form panel */}
          <div className="lo-form-wrap">
            <form onSubmit={submit} className="lo-form" noValidate>
              <div>
                <h1 className="lo-title">Criar conta</h1>
                <p className="lo-caption">Comece gratuitamente.</p>
              </div>

              {error && (
                <div role="alert" className="lo-error">
                  <AlertCircle size={16} aria-hidden /> {error}
                </div>
              )}

              <div className="lo-field">
                <label htmlFor="ca-name">Nome</label>
                <input
                  id="ca-name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div className="lo-field">
                <label htmlFor="ca-email">E-mail</label>
                <input
                  id="ca-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              <div className="lo-field">
                <label htmlFor="ca-password">Senha</label>
                <input
                  id="ca-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
                <span className="lo-hint-field">
                  Mínimo 8 caracteres, uma maiúscula e um número.
                </span>
              </div>

              <div className="lo-checkbox-wrap">
                <input
                  id="ca-lgpd"
                  type="checkbox"
                  className="lo-checkbox"
                  checked={form.lgpdAccepted}
                  onChange={(e) => setForm((f) => ({ ...f, lgpdAccepted: e.target.checked }))}
                  required
                />
                <label htmlFor="ca-lgpd" className="lo-checkbox-label">
                  Li e aceito os termos de uso e a política de privacidade (LGPD).
                </label>
              </div>

              <button
                type="submit"
                disabled={busy || !form.lgpdAccepted}
                className="lo-btn"
              >
                {busy ? "Criando conta…" : "Criar conta"}
              </button>

              <p className="lo-hint">
                Já tem uma conta?{" "}
                <a href="/entrar" className="lo-link">
                  Entrar
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .lo-root {
          min-height: 100dvh;
          background: hsl(190 47% 18%);
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

        .lo-hint-field {
          font-size: 12px;
          color: hsl(var(--muted-foreground));
          line-height: 1.4;
        }

        .lo-checkbox-wrap {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .lo-checkbox {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          margin-top: 2px;
          accent-color: hsl(var(--primary));
          cursor: pointer;
        }

        .lo-checkbox-label {
          font-size: 13px;
          color: hsl(var(--muted-foreground));
          line-height: 1.5;
          cursor: pointer;
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

        .lo-link {
          color: hsl(var(--primary));
          text-decoration: none;
          font-weight: 500;
        }

        .lo-link:hover {
          text-decoration: underline;
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
            background: hsl(190 47% 20%);
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
            color: hsl(38 85% 56%);
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
            background: hsl(38 85% 56%);
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
