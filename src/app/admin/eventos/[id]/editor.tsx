"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Download, QrCode } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";
import type { Event } from "@/lib/types";
import { sampleQuestions } from "@/lib/fixtures";

type Tab = "geral" | "sobre" | "identidade" | "mediadores" | "participantes" | "qrcode" | "configuracoes";

const TABS: { id: Tab; label: string }[] = [
  { id: "geral", label: "Geral" },
  { id: "sobre", label: "Sobre" },
  { id: "identidade", label: "Identidade visual" },
  { id: "mediadores", label: "Mediadores" },
  { id: "participantes", label: "Participantes" },
  { id: "qrcode", label: "QR Code" },
  { id: "configuracoes", label: "Configurações" },
];

const THEME_PRESETS = [
  { id: "incluir", label: "INCLUIR", bg: "#1E4953", accent: "#F2B33D" },
  { id: "voz-base", label: "voz. base", bg: "#ffffff", accent: "#7C7AE8" },
  { id: "warmth", label: "Warmth", bg: "#3D1F0A", accent: "#F2923D" },
  { id: "mono", label: "Mono", bg: "#141414", accent: "#FFFFFF" },
  { id: "lake", label: "Lake", bg: "#0E2B3D", accent: "#4DBFB8" },
  { id: "vine", label: "Vine", bg: "#1A2E1A", accent: "#7EC85E" },
];

const MEDIATORS = [
  { id: "usr_leonardo", name: "Leonardo Veríssimo", email: "leonardo@incluir.org" },
  { id: "usr_davi", name: "Davi Nogueira", email: "davi@ippaiquere.org" },
  { id: "usr_carla", name: "Carla Marcondes", email: "carla.m@ippaiquere.org" },
];

export function EventEditor({ event, isNew }: { event: Event | null; isNew: boolean }) {
  const [tab, setTab] = useState<Tab>("geral");
  const [name, setName] = useState(event?.name ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [accentColor, setAccentColor] = useState(event?.theme.accent ?? "#F2B33D");
  const [bgColor, setBgColor] = useState(event?.theme.background ?? "#1E4953");
  const [preset, setPreset] = useState(event?.theme.preset ?? "incluir");

  const inp: React.CSSProperties = { padding: "10px 14px", borderRadius: 8, border: "1.5px solid hsl(var(--border))", background: "hsl(var(--background))", color: "hsl(var(--foreground))", fontSize: 15, fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 24px", gap: 12 }}>
        <Link href="/admin/eventos" aria-label="Voltar" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: "1px solid hsl(var(--border))", textDecoration: "none", color: "hsl(var(--foreground))" }}>
          <ArrowLeft size={16} aria-hidden />
        </Link>
        <VozWordmark size={20} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
          {isNew ? "Novo evento" : event?.name}
        </span>
        <button style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Save size={14} aria-hidden /> Salvar
        </button>
      </header>

      {/* Tab bar */}
      <div style={{ borderBottom: "1px solid hsl(var(--border))", padding: "0 24px", display: "flex", gap: 2, overflowX: "auto" }} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "12px 16px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap",
              background: "transparent",
              color: tab === t.id ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              borderBottom: tab === t.id ? "2px solid hsl(var(--primary))" : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }} role="tabpanel">
        {tab === "geral" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600 }}>
            <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: 0 }}>Informações gerais</h2>
            <Field label="Nome do evento" htmlFor="ev-name">
              <input id="ev-name" value={name} onChange={(e) => setName(e.target.value)} style={inp} />
            </Field>
            <Field label="Slug (URL)" htmlFor="ev-slug">
              <input id="ev-slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} style={inp} />
              <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: "4px 0 0" }}>voz.app/e/{slug || "slug-do-evento"}</p>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Início" htmlFor="ev-start">
                <input id="ev-start" type="datetime-local" defaultValue="2025-05-23T14:00" style={inp} />
              </Field>
              <Field label="Término" htmlFor="ev-end">
                <input id="ev-end" type="datetime-local" defaultValue="2025-05-23T19:00" style={inp} />
              </Field>
            </div>
            <Field label="Local" htmlFor="ev-place">
              <input id="ev-place" defaultValue={event?.place} style={inp} />
            </Field>
            <Field label="Endereço completo" htmlFor="ev-address">
              <input id="ev-address" defaultValue={event?.address} style={inp} />
            </Field>
          </div>
        )}

        {tab === "sobre" && (
          <div>
            <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: "0 0 20px" }}>Sobre o evento</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
              <div>
                <label htmlFor="ev-about" style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 8 }}>Conteúdo (Markdown)</label>
                <textarea
                  id="ev-about"
                  defaultValue={event?.about}
                  rows={24}
                  style={{ ...inp, fontFamily: '"JetBrains Mono", monospace', fontSize: 13, resize: "vertical" }}
                />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Preview (mobile)</p>
                <div style={{ width: 280, height: 560, border: "8px solid #0A0A0A", borderRadius: 36, overflow: "hidden", background: "#1E4953", fontSize: 11, color: "#fff", padding: 12 }}>
                  <p style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 20, margin: "0 0 8px" }}>INCLUIR.</p>
                  <p style={{ color: "#c5d4d8", fontSize: 10 }}>Preview da página do evento</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "identidade" && (
          <div style={{ maxWidth: 700 }}>
            <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: "0 0 20px" }}>Identidade visual</h2>

            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Presets</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {THEME_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPreset(p.id as typeof preset); setBgColor(p.bg); setAccentColor(p.accent); }}
                    style={{ padding: 12, borderRadius: 10, border: "2px solid", borderColor: preset === p.id ? "hsl(var(--primary))" : "hsl(var(--border))", cursor: "pointer", background: p.bg, textAlign: "left" }}
                  >
                    <span style={{ display: "block", width: 24, height: 24, borderRadius: 6, background: p.accent, marginBottom: 6 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <Field label="Cor de fundo" htmlFor="ev-bg">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" id="ev-bg" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ width: 44, height: 44, borderRadius: 8, border: "1px solid hsl(var(--border))", cursor: "pointer", padding: 2 }} />
                  <input value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ ...inp, width: "auto", flex: 1 }} />
                </div>
              </Field>
              <Field label="Cor de destaque (accent)" htmlFor="ev-accent">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" id="ev-accent" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} style={{ width: 44, height: 44, borderRadius: 8, border: "1px solid hsl(var(--border))", cursor: "pointer", padding: 2 }} />
                  <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} style={{ ...inp, width: "auto", flex: 1 }} />
                </div>
              </Field>
            </div>

            <div>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Preview ao vivo</p>
              <div style={{ borderRadius: 12, overflow: "hidden", background: bgColor, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 32, color: "#fff", letterSpacing: "-0.02em" }}>
                  IN<span style={{ color: accentColor }}>CLUIR.</span>
                </span>
                <div style={{ display: "inline-flex", gap: 6, alignItems: "center", background: `${accentColor}22`, padding: "6px 12px", borderRadius: 999, alignSelf: "flex-start" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: accentColor }} />
                  <span style={{ color: "#fff", fontSize: 13 }}>ao vivo · 42 participantes</span>
                </div>
                <button style={{ height: 44, borderRadius: 8, border: "none", background: accentColor, color: "#1E4953", fontWeight: 700, fontSize: 15, cursor: "default" }}>
                  Fazer uma pergunta
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "mediadores" && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: 0 }}>Mediadores</h2>
              <button style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                + Adicionar mediador
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MEDIATORS.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "hsl(var(--muted))", borderRadius: 10, border: "1px solid hsl(var(--border))" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "hsl(var(--primary) / .15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                    {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{m.name}</p>
                    <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0 }}>{m.email}</p>
                  </div>
                  <button style={{ height: 32, padding: "0 10px", borderRadius: 6, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 12, cursor: "pointer", color: "hsl(var(--destructive))" }}>
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "participantes" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: 0 }}>Participantes</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 13, cursor: "pointer" }}>
                  <Download size={14} aria-hidden /> CSV
                </button>
                <button style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 13, cursor: "pointer" }}>
                  <Download size={14} aria-hidden /> XLSX
                </button>
              </div>
            </div>
            <div style={{ border: "1px solid hsl(var(--border))", borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "hsl(var(--muted))", borderBottom: "1px solid hsl(var(--border))" }}>
                    {["Nome", "Contato", "Perguntas", "Aceite LGPD"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: 13 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleQuestions.filter((q) => q.authorContact).map((q) => (
                    <tr key={q.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                      <td style={{ padding: "10px 16px" }}>{q.authorName}</td>
                      <td style={{ padding: "10px 16px", color: "hsl(var(--muted-foreground))" }}>{q.authorContact}</td>
                      <td style={{ padding: "10px 16px" }}>1</td>
                      <td style={{ padding: "10px 16px", color: "hsl(var(--success))" }}>✓ Sim</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "qrcode" && (
          <div style={{ maxWidth: 500 }}>
            <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: "0 0 20px" }}>QR Code</h2>
            <div style={{ background: "#fff", border: "1px solid hsl(var(--border))", borderRadius: 16, padding: 24, position: "relative", textAlign: "center", marginBottom: 20 }}>
              <QrCode size={280} style={{ display: "block", margin: "0 auto", color: "#0A0A0A" }} aria-label="QR Code do evento" />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ background: "#fff", padding: "8px 12px", borderRadius: 8, border: "3px solid #F2B33D" }}>
                  <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 18 }}>
                    voz<span style={{ color: "#F2B33D" }}>.</span>
                  </span>
                </div>
              </div>
            </div>
            <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: "hsl(var(--muted-foreground))", textAlign: "center", marginBottom: 16 }}>
              voz.app/e/incluir-2025
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 14, cursor: "pointer" }}>
                <Download size={14} aria-hidden /> PNG
              </button>
              <button style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 14, cursor: "pointer" }}>
                <Download size={14} aria-hidden /> SVG
              </button>
            </div>
          </div>
        )}

        {tab === "configuracoes" && (
          <div style={{ maxWidth: 500 }}>
            <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: "0 0 20px" }}>Configurações</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Field label="Máximo de perguntas por participante" htmlFor="cfg-max">
                <input id="cfg-max" type="number" defaultValue={5} min={1} max={20} style={{ ...inp, width: 80 }} />
              </Field>
              <ConfigToggle label="Moderação manual" description="O mediador aprova cada pergunta antes de exibir." defaultChecked />
              <ConfigToggle label="Permitir anônimos" description="Participantes podem enviar sem identificação." defaultChecked />
              <ConfigToggle label="LGPD obrigatório" description="Exige aceite antes do envio." defaultChecked />

              <div style={{ marginTop: 8, padding: 20, background: "hsl(var(--destructive) / .08)", border: "1px solid hsl(var(--destructive) / .2)", borderRadius: 12 }}>
                <p style={{ fontWeight: 600, fontSize: 15, color: "hsl(var(--destructive))", margin: "0 0 8px" }}>Zona de perigo</p>
                <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: "0 0 12px" }}>Encerrar o evento impede novos envios de perguntas.</p>
                <button style={{ height: 40, padding: "0 16px", borderRadius: 8, border: "1px solid hsl(var(--destructive))", background: "transparent", color: "hsl(var(--destructive))", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Encerrar evento
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 14, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

function ConfigToggle({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked ?? false);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
      <div>
        <p style={{ fontWeight: 500, fontSize: 15, margin: "0 0 2px" }}>{label}</p>
        <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0 }}>{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => setChecked((v) => !v)}
        style={{ width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer", position: "relative", flexShrink: 0, background: checked ? "hsl(var(--primary))" : "hsl(var(--muted))", transition: "background .2s" }}
      >
        <span style={{ position: "absolute", top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
      </button>
    </div>
  );
}
