"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Download, QrCode } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";
import { toast } from "sonner";
import type { Event, UserRole } from "@/lib/types";

type Tab = "geral" | "sobre" | "identidade" | "mediadores" | "participantes" | "qrcode" | "configuracoes";

interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastSeenAt: string | null;
}

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

function toDatetimeLocal(iso: string) {
  return iso ? new Date(iso).toISOString().slice(0, 16) : "";
}

export function EventEditor({ eventId, isNew }: { eventId: string | null; isNew: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("geral");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [place, setPlace] = useState("");
  const [address, setAddress] = useState("");
  const [about, setAbout] = useState("");
  const [accentColor, setAccentColor] = useState("#F2B33D");
  const [bgColor, setBgColor] = useState("#1E4953");
  const [preset, setPreset] = useState("incluir");
  const [saving, setSaving] = useState(false);
  const [eventName, setEventName] = useState("");

  const [mediators, setMediators] = useState<UserPublic[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserPublic[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [mediatorsLoading, setMediatorsLoading] = useState(false);

  const inp: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1.5px solid hsl(var(--border))",
    background: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    fontSize: 15,
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/v1/events/${eventId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Evento não encontrado");
        return r.json();
      })
      .then((ev: Event) => {
        setName(ev.name);
        setSlug(ev.slug);
        setStartsAt(toDatetimeLocal(ev.startsAt));
        setEndsAt(toDatetimeLocal(ev.endsAt));
        setPlace(ev.place);
        setAddress(ev.address ?? "");
        setAbout(ev.about ?? "");
        setAccentColor(ev.theme.accent ?? "#F2B33D");
        setBgColor(ev.theme.background ?? "#1E4953");
        setPreset(ev.theme.preset ?? "incluir");
        setEventName(ev.name);
      })
      .catch(() => toast.error("Erro ao carregar evento."));
  }, [eventId]);

  useEffect(() => {
    if (tab !== "mediadores" || !eventId) return;
    setMediatorsLoading(true);
    Promise.all([
      fetch(`/api/v1/events/${eventId}/mediators`).then((r) => r.json()) as Promise<{ mediators: UserPublic[] }>,
      fetch("/api/v1/users?role=mediador").then((r) => r.json()) as Promise<{ users: UserPublic[] }>,
    ])
      .then(([mRes, uRes]) => {
        setMediators(mRes.mediators ?? []);
        setAvailableUsers(uRes.users ?? []);
      })
      .catch(() => toast.error("Erro ao carregar mediadores."))
      .finally(() => setMediatorsLoading(false));
  }, [tab, eventId]);

  async function handleSave() {
    if (!eventId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          place,
          address,
          about,
          theme: { preset, background: bgColor, accent: accentColor },
        }),
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      const ev = await res.json() as Event;
      setEventName(ev.name);
      toast.success("Evento salvo.");
    } catch {
      toast.error("Erro ao salvar evento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMediator() {
    if (!eventId || !selectedUserId) return;
    try {
      const res = await fetch(`/api/v1/events/${eventId}/mediators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      if (res.status === 409) {
        toast.error("Mediador já atribuído.");
        return;
      }
      if (!res.ok) throw new Error("Falha");
      const added = availableUsers.find((u) => u.id === selectedUserId);
      if (added) setMediators((prev) => [...prev, added]);
      setSelectedUserId("");
      toast.success("Mediador adicionado.");
    } catch {
      toast.error("Erro ao adicionar mediador.");
    }
  }

  async function handleRemoveMediator(userId: string) {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/v1/events/${eventId}/mediators/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha");
      setMediators((prev) => prev.filter((m) => m.id !== userId));
      toast.success("Removido.");
    } catch {
      toast.error("Erro ao remover mediador.");
    }
  }

  async function handleDeleteEvent() {
    if (!eventId) return;
    if (!window.confirm("Encerrar este evento? Esta ação não pode ser desfeita.")) return;
    try {
      const res = await fetch(`/api/v1/events/${eventId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha");
      toast.success("Evento encerrado.");
      router.push("/admin/eventos");
    } catch {
      toast.error("Erro ao encerrar evento.");
    }
  }

  const unassignedUsers = availableUsers.filter((u) => !mediators.some((m) => m.id === u.id));

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 24px", gap: 12 }}>
        <Link href="/admin/eventos" aria-label="Voltar" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: "1px solid hsl(var(--border))", textDecoration: "none", color: "hsl(var(--foreground))" }}>
          <ArrowLeft size={16} aria-hidden />
        </Link>
        <VozWordmark size={20} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
          {isNew ? "Novo evento" : eventName || "…"}
        </span>
        {!isNew && (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            <Save size={14} aria-hidden /> {saving ? "Salvando…" : "Salvar"}
          </button>
        )}
      </header>

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
                <input id="ev-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={inp} />
              </Field>
              <Field label="Término" htmlFor="ev-end">
                <input id="ev-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} style={inp} />
              </Field>
            </div>
            <Field label="Local" htmlFor="ev-place">
              <input id="ev-place" value={place} onChange={(e) => setPlace(e.target.value)} style={inp} />
            </Field>
            <Field label="Endereço completo" htmlFor="ev-address">
              <input id="ev-address" value={address} onChange={(e) => setAddress(e.target.value)} style={inp} />
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
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={24}
                  style={{ ...inp, fontFamily: '"JetBrains Mono", monospace', fontSize: 13, resize: "vertical" }}
                />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Preview (mobile)</p>
                <div style={{ width: 280, height: 560, border: "8px solid #0A0A0A", borderRadius: 36, overflow: "hidden", background: bgColor, fontSize: 11, color: "#fff", padding: 12 }}>
                  <p style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 20, margin: "0 0 8px" }}>{name || "Evento"}</p>
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
                    onClick={() => { setPreset(p.id); setBgColor(p.bg); setAccentColor(p.accent); }}
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
                  {name ? name.toUpperCase().slice(0, 6) : "EVENTO"}<span style={{ color: accentColor }}>.</span>
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
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={{ ...inp, width: "auto", flex: 1 }}
                aria-label="Selecionar mediador"
              >
                <option value="">Selecione um mediador…</option>
                {unassignedUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                ))}
              </select>
              <button
                onClick={handleAddMediator}
                disabled={!selectedUserId}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 44, padding: "0 14px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 13, fontWeight: 600, cursor: selectedUserId ? "pointer" : "not-allowed", opacity: selectedUserId ? 1 : 0.5, whiteSpace: "nowrap" }}
              >
                + Adicionar
              </button>
            </div>

            {mediatorsLoading && (
              <div style={{ padding: 24, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>Carregando…</div>
            )}

            {!mediatorsLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {mediators.length === 0 && (
                  <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", textAlign: "center", padding: 24 }}>
                    Nenhum mediador atribuído.
                  </p>
                )}
                {mediators.map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "hsl(var(--muted))", borderRadius: 10, border: "1px solid hsl(var(--border))" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "hsl(var(--primary) / .15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                      {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{m.name}</p>
                      <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0 }}>{m.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveMediator(m.id)}
                      style={{ height: 32, padding: "0 10px", borderRadius: 6, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 12, cursor: "pointer", color: "hsl(var(--destructive))" }}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                  <tr>
                    <td colSpan={4} style={{ padding: "24px 16px", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
                      Dados de participantes disponíveis em breve.
                    </td>
                  </tr>
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
              voz.app/e/{slug || "slug-do-evento"}
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
                <button
                  onClick={handleDeleteEvent}
                  style={{ height: 40, padding: "0 16px", borderRadius: 8, border: "1px solid hsl(var(--destructive))", background: "transparent", color: "hsl(var(--destructive))", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
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
