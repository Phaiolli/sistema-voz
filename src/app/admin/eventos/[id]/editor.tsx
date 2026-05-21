"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Save, Download, Plus, X, Upload, CheckCircle2, Package, Trophy, ExternalLink } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";
import { HeaderControls } from "@/components/voz/header-controls";
import { generateQrWithLogo } from "@/lib/qr";
import { toast } from "sonner";
import type { Event, UserRole, EventPageSpeaker, EventPageScheduleItem, Registration, RegistrationConfig } from "@/lib/types";

type Tab = "geral" | "sobre" | "identidade" | "mediadores" | "participantes" | "qrcode" | "configuracoes" | "inscricoes" | "sorteio";

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
  { id: "inscricoes", label: "Inscrições" },
  { id: "sorteio", label: "Sorteio" },
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

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/v1/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "Falha no upload.");
  }
  const data = await res.json() as { url: string };
  return data.url;
}

export function EventEditor({ eventId, isNew }: { eventId: string | null; isNew: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("geral");

  // Geral
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [place, setPlace] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [eventName, setEventName] = useState("");

  // Identidade
  const [accentColor, setAccentColor] = useState("#F2B33D");
  const [bgColor, setBgColor] = useState("#1E4953");
  const [preset, setPreset] = useState("incluir");

  // Sobre (estruturado)
  const [logo, setLogo] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [aboutText, setAboutText] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [organizerInstagram, setOrganizerInstagram] = useState("");
  const [speakers, setSpeakers] = useState<EventPageSpeaker[]>([]);
  const [schedule, setSchedule] = useState<EventPageScheduleItem[]>([]);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Mediadores
  const [mediators, setMediators] = useState<UserPublic[]>([]);
  const [mediatorsLoading, setMediatorsLoading] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", email: "", password: "", submitting: false });

  // QR Code
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Inscrições
  const [regEnabled, setRegEnabled] = useState(false);
  const [regOpensAt, setRegOpensAt] = useState("");
  const [regClosesAt, setRegClosesAt] = useState("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);

  // Sorteio
  const [drawPhase, setDrawPhase] = useState<"idle" | "counting" | "winner">("idle");
  const [drawCountdown, setDrawCountdown] = useState(5);
  const [drawWinner, setDrawWinner] = useState<{ id: string; name: string } | null>(null);
  const [drawRemaining, setDrawRemaining] = useState<number | null>(null);

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

  const smInp: React.CSSProperties = { ...inp, fontSize: 14, padding: "8px 12px" };

  // Load event
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
        setAccentColor(ev.theme.accent ?? "#F2B33D");
        setBgColor(ev.theme.background ?? "#1E4953");
        setPreset(ev.theme.preset ?? "incluir");
        setEventName(ev.name);
        const regCfg = ev.config?.registration as RegistrationConfig | undefined;
        setRegEnabled(regCfg?.enabled ?? false);
        setRegOpensAt(regCfg?.opensAt ? new Date(regCfg.opensAt).toISOString().slice(0, 16) : "");
        setRegClosesAt(regCfg?.closesAt ? new Date(regCfg.closesAt).toISOString().slice(0, 16) : "");
        const page = ev.config?.page;
        setLogo(page?.logo ?? "");
        setAboutText(page?.aboutText ?? ev.about ?? "");
        setOrganizer(page?.organizer ?? "");
        setOrganizerInstagram(page?.organizerInstagram ?? "");
        setSpeakers(page?.speakers ?? []);
        setSchedule(page?.schedule ?? []);
      })
      .catch(() => toast.error("Erro ao carregar evento."));
  }, [eventId]);

  // Load mediators when tab opens
  useEffect(() => {
    if (tab !== "mediadores" || !eventId) return;
    setMediatorsLoading(true);
    fetch(`/api/v1/events/${eventId}/mediators`)
      .then((r) => r.json())
      .then((res: { mediators: UserPublic[] }) => setMediators(res.mediators ?? []))
      .catch(() => toast.error("Erro ao carregar mediadores."))
      .finally(() => setMediatorsLoading(false));
  }, [tab, eventId]);

  // Load registrations when tab opens
  useEffect(() => {
    if (tab !== "inscricoes" && tab !== "sorteio") return;
    if (!eventId) return;
    setRegsLoading(true);
    fetch(`/api/v1/events/${eventId}/registrations`)
      .then((r) => r.json() as Promise<{ registrations: Registration[] }>)
      .then((d) => setRegistrations(d.registrations ?? []))
      .catch(() => toast.error("Erro ao carregar inscritos."))
      .finally(() => setRegsLoading(false));
  }, [tab, eventId]);

  // Generate QR code
  useEffect(() => {
    if (tab !== "qrcode" || !slug) return;
    const url = `${window.location.origin}/e/${slug}`;
    generateQrWithLogo(url, 280).then(setQrDataUrl);
  }, [tab, slug]);

  async function handleSave() {
    if (!eventId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, slug,
          ...(startsAt ? { startsAt: new Date(startsAt).toISOString() } : {}),
          ...(endsAt ? { endsAt: new Date(endsAt).toISOString() } : {}),
          place, address,
          about: aboutText,
          theme: { preset, background: bgColor, accent: accentColor },
          config: {
            page: { logo, aboutText, organizer, organizerInstagram, speakers, schedule },
            registration: {
              enabled: regEnabled,
              opensAt: regOpensAt ? new Date(regOpensAt).toISOString() : undefined,
              closesAt: regClosesAt ? new Date(regClosesAt).toISOString() : undefined,
            },
          },
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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const url = await uploadImage(file);
      setLogo(url);
      toast.success("Logo enviado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload.");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  function addSpeaker() {
    setSpeakers((prev) => [...prev, { id: crypto.randomUUID(), name: "", role: "", bio: "", photoUrl: "" }]);
  }

  function updateSpeaker(id: string, patch: Partial<EventPageSpeaker>) {
    setSpeakers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function uploadSpeakerPhoto(speakerId: string, file: File) {
    try {
      const url = await uploadImage(file);
      updateSpeaker(speakerId, { photoUrl: url });
      toast.success("Foto enviada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload.");
    }
  }

  function removeSpeaker(id: string) {
    setSpeakers((prev) => prev.filter((s) => s.id !== id));
  }

  function addScheduleItem() {
    setSchedule((prev) => [...prev, { id: crypto.randomUUID(), time: "", title: "", description: "" }]);
  }

  function updateScheduleItem(id: string, patch: Partial<EventPageScheduleItem>) {
    setSchedule((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeScheduleItem(id: string) {
    setSchedule((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleCreateMediator(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId) return;
    setNewMed((m) => ({ ...m, submitting: true }));
    try {
      // Create user with role=mediador
      const createRes = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newMed.name, email: newMed.email, password: newMed.password, role: "mediador" }),
      });
      if (createRes.status === 409) { toast.error("E-mail já cadastrado."); return; }
      if (!createRes.ok) {
        const err = await createRes.json() as { error?: { message?: string } };
        toast.error(err.error?.message ?? "Erro ao criar usuário.");
        return;
      }
      const newUser = await createRes.json() as UserPublic;

      // Assign to event
      const assignRes = await fetch(`/api/v1/events/${eventId}/mediators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newUser.id }),
      });
      if (!assignRes.ok) throw new Error("Falha na atribuição");

      setMediators((prev) => [...prev, newUser]);
      setNewMed({ name: "", email: "", password: "", submitting: false });
      toast.success(`${newUser.name} adicionado como mediador.`);
    } catch {
      toast.error("Erro ao criar mediador.");
    } finally {
      setNewMed((m) => ({ ...m, submitting: false }));
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

  async function handleDraw() {
    if (!eventId) return;
    setDrawPhase("counting");
    setDrawCountdown(5);
    setDrawWinner(null);
    let tick = 5;
    const interval = setInterval(() => { tick -= 1; setDrawCountdown(tick); if (tick <= 0) clearInterval(interval); }, 1000);
    await new Promise((r) => setTimeout(r, 5000));
    clearInterval(interval);
    try {
      const res = await fetch(`/api/v1/events/${eventId}/draw`, { method: "POST" });
      const data = await res.json() as { winner?: { id: string; name: string }; remainingCount?: number; error?: { message?: string; code?: string } };
      if (!res.ok) {
        if (data.error?.code === "NO_ELIGIBLE") toast.info("Todos os inscritos com check-in já foram sorteados.");
        else toast.error(data.error?.message ?? "Erro ao sortear.");
        setDrawPhase("idle");
        return;
      }
      setDrawWinner(data.winner ?? null);
      setDrawRemaining(data.remainingCount ?? null);
      setDrawPhase("winner");
    } catch { toast.error("Erro de conexão."); setDrawPhase("idle"); }
  }

  async function handleResetDraw() {
    if (!eventId) return;
    if (!window.confirm("Resetar o sorteio? Todos os inscritos voltarão a participar.")) return;
    try {
      await fetch(`/api/v1/events/${eventId}/draw`, { method: "DELETE" });
      toast.success("Sorteio resetado.");
      setDrawPhase("idle");
      setDrawWinner(null);
    } catch { toast.error("Erro ao resetar."); }
  }

  async function toggleRegistrationField(reg: Registration, field: "checkedIn" | "kitDelivered") {
    if (!eventId) return;
    const newVal = !reg[field];
    setRegistrations((prev) => prev.map((r) => r.id === reg.id ? { ...r, [field]: newVal } : r));
    try {
      const res = await fetch(`/api/v1/events/${eventId}/registrations/${reg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newVal }),
      });
      if (!res.ok) throw new Error("Falha");
    } catch {
      setRegistrations((prev) => prev.map((r) => r.id === reg.id ? { ...r, [field]: !newVal } : r));
      toast.error("Erro ao atualizar inscrição.");
    }
  }

  function downloadQr(format: "png") {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qrcode-${slug || "evento"}.${format}`;
    a.click();
  }

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 24px", gap: 12 }}>
        <Link href="/admin/eventos" aria-label="Voltar" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: "1px solid hsl(var(--border))", textDecoration: "none", color: "hsl(var(--foreground))" }}>
          <ArrowLeft size={16} aria-hidden />
        </Link>
        <VozWordmark size={20} />
        <div style={{ flex: 1 }} />
        <HeaderControls />
      </header>

      <div style={{ borderBottom: "1px solid hsl(var(--border))", padding: "0 24px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 2, flex: 1, overflowX: "auto" }} role="tablist">
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, paddingLeft: 8, borderLeft: "1px solid hsl(var(--border))" }}>
          <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {isNew ? "Novo evento" : eventName || "…"}
          </span>
          {!isNew && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
            >
              <Save size={13} aria-hidden /> {saving ? "Salvando…" : "Salvar"}
            </button>
          )}
        </div>
      </div>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }} role="tabpanel">

        {/* ─── GERAL ─── */}
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

        {/* ─── SOBRE ─── */}
        {tab === "sobre" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 700 }}>
            <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: 0 }}>Página do evento</h2>

            {/* Logo */}
            <SectionBlock title="Logo do evento">
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {logo && (
                  <div style={{ width: 80, height: 80, borderRadius: 10, border: "1px solid hsl(var(--border))", overflow: "hidden", background: "hsl(var(--muted))", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Image src={logo} alt="Logo" width={80} height={80} style={{ objectFit: "contain", width: "100%", height: "100%" }} unoptimized />
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} id="logo-upload" onChange={handleLogoUpload} />
                  <label
                    htmlFor="logo-upload"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 13, cursor: logoUploading ? "not-allowed" : "pointer", opacity: logoUploading ? 0.6 : 1 }}
                  >
                    <Upload size={14} aria-hidden /> {logoUploading ? "Enviando…" : logo ? "Trocar logo" : "Fazer upload"}
                  </label>
                  {logo && (
                    <button onClick={() => setLogo("")} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "hsl(var(--destructive))", border: "none", background: "none", cursor: "pointer", padding: 0 }}>
                      <X size={12} /> Remover
                    </button>
                  )}
                  <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0 }}>PNG, JPG, SVG · max 3 MB</p>
                </div>
              </div>
            </SectionBlock>

            {/* Sobre */}
            <SectionBlock title="Texto sobre o evento">
              <textarea
                id="ev-about"
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                rows={4}
                placeholder="Uma breve descrição do evento para os participantes…"
                style={{ ...smInp, resize: "vertical" }}
              />
            </SectionBlock>

            {/* Organizador */}
            <SectionBlock title="Realização">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Organização" htmlFor="ev-org">
                  <input id="ev-org" value={organizer} onChange={(e) => setOrganizer(e.target.value)} style={smInp} placeholder="Nome da organização" />
                </Field>
                <Field label="Instagram" htmlFor="ev-ig">
                  <input id="ev-ig" value={organizerInstagram} onChange={(e) => setOrganizerInstagram(e.target.value)} style={smInp} placeholder="@handle" />
                </Field>
              </div>
            </SectionBlock>

            {/* Programação */}
            <SectionBlock title="Programação" action={<button onClick={addScheduleItem} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, height: 30, padding: "0 10px", borderRadius: 6, border: "1px solid hsl(var(--border))", background: "transparent", cursor: "pointer" }}><Plus size={12} /> Adicionar</button>}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {schedule.length === 0 && (
                  <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Nenhum item. Clique em "Adicionar" para incluir.</p>
                )}
                {schedule.map((item) => (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr auto", gap: 8, alignItems: "start", padding: 12, background: "hsl(var(--muted))", borderRadius: 8 }}>
                    <input value={item.time} onChange={(e) => updateScheduleItem(item.id, { time: e.target.value })} placeholder="14h00" style={smInp} aria-label="Horário" />
                    <input value={item.title} onChange={(e) => updateScheduleItem(item.id, { title: e.target.value })} placeholder="Título" style={smInp} aria-label="Título" />
                    <input value={item.description ?? ""} onChange={(e) => updateScheduleItem(item.id, { description: e.target.value })} placeholder="Descrição (opcional)" style={smInp} aria-label="Descrição" />
                    <button onClick={() => removeScheduleItem(item.id)} aria-label="Remover" style={{ height: 36, width: 36, borderRadius: 6, border: "1px solid hsl(var(--border))", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--destructive))", flexShrink: 0 }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </SectionBlock>

            {/* Palestrantes */}
            <SectionBlock title="Palestrantes" action={<button onClick={addSpeaker} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, height: 30, padding: "0 10px", borderRadius: 6, border: "1px solid hsl(var(--border))", background: "transparent", cursor: "pointer" }}><Plus size={12} /> Adicionar</button>}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {speakers.length === 0 && (
                  <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Nenhum palestrante. Clique em "Adicionar" para incluir.</p>
                )}
                {speakers.map((sp) => (
                  <div key={sp.id} style={{ padding: 14, background: "hsl(var(--muted))", borderRadius: 10, border: "1px solid hsl(var(--border))" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      {/* Photo */}
                      <div style={{ flexShrink: 0 }}>
                        <div style={{ width: 60, height: 60, borderRadius: "50%", overflow: "hidden", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {sp.photoUrl ? (
                            <Image src={sp.photoUrl} alt={sp.name || "Palestrante"} width={60} height={60} style={{ objectFit: "cover", width: "100%", height: "100%" }} unoptimized />
                          ) : (
                            <span style={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }}>foto</span>
                          )}
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer", color: "hsl(var(--muted-foreground))" }}>
                          <Upload size={10} />
                          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSpeakerPhoto(sp.id, f); e.target.value = ""; }} />
                          Foto
                        </label>
                      </div>
                      {/* Fields */}
                      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <input value={sp.name} onChange={(e) => updateSpeaker(sp.id, { name: e.target.value })} placeholder="Nome" style={smInp} aria-label="Nome do palestrante" />
                        <input value={sp.role} onChange={(e) => updateSpeaker(sp.id, { role: e.target.value })} placeholder="Cargo / especialidade" style={smInp} aria-label="Cargo" />
                        <textarea value={sp.bio ?? ""} onChange={(e) => updateSpeaker(sp.id, { bio: e.target.value })} placeholder="Mini bio" rows={2} style={{ ...smInp, gridColumn: "1 / -1", resize: "vertical" }} aria-label="Bio" />
                      </div>
                      <button onClick={() => removeSpeaker(sp.id)} aria-label="Remover palestrante" style={{ height: 30, width: 30, borderRadius: 6, border: "1px solid hsl(var(--border))", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--destructive))", flexShrink: 0 }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionBlock>
          </div>
        )}

        {/* ─── IDENTIDADE ─── */}
        {tab === "identidade" && (
          <div style={{ maxWidth: 700 }}>
            <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: "0 0 20px" }}>Identidade visual</h2>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Presets</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {THEME_PRESETS.map((p) => (
                  <button key={p.id} onClick={() => { setPreset(p.id); setBgColor(p.bg); setAccentColor(p.accent); }} style={{ padding: 12, borderRadius: 10, border: "2px solid", borderColor: preset === p.id ? "hsl(var(--primary))" : "hsl(var(--border))", cursor: "pointer", background: p.bg, textAlign: "left" }}>
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
              <Field label="Cor de destaque" htmlFor="ev-accent">
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

        {/* ─── MEDIADORES ─── */}
        {tab === "mediadores" && (
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: "0 0 20px" }}>Mediadores</h2>

            {/* Create form */}
            <form onSubmit={handleCreateMediator} style={{ padding: 16, background: "hsl(var(--muted))", borderRadius: 10, border: "1px solid hsl(var(--border))", marginBottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Novo mediador</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Nome" htmlFor="med-name">
                  <input id="med-name" required value={newMed.name} onChange={(e) => setNewMed((m) => ({ ...m, name: e.target.value }))} style={smInp} placeholder="Nome completo" />
                </Field>
                <Field label="E-mail" htmlFor="med-email">
                  <input id="med-email" type="email" required value={newMed.email} onChange={(e) => setNewMed((m) => ({ ...m, email: e.target.value }))} style={smInp} />
                </Field>
                <Field label="Senha" htmlFor="med-pass">
                  <input id="med-pass" type="password" required value={newMed.password} onChange={(e) => setNewMed((m) => ({ ...m, password: e.target.value }))} style={smInp} placeholder="Mín. 8 chars, 1 maiúscula, 1 número" />
                </Field>
              </div>
              <button
                type="submit"
                disabled={newMed.submitting}
                style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 13, fontWeight: 600, cursor: newMed.submitting ? "not-allowed" : "pointer", opacity: newMed.submitting ? 0.7 : 1 }}
              >
                <Plus size={14} aria-hidden /> {newMed.submitting ? "Criando…" : "Criar e atribuir"}
              </button>
            </form>

            {/* List */}
            {mediatorsLoading && <div style={{ padding: 24, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>Carregando…</div>}
            {!mediatorsLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {mediators.length === 0 && (
                  <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", textAlign: "center", padding: 24 }}>Nenhum mediador atribuído.</p>
                )}
                {mediators.map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "hsl(var(--muted))", borderRadius: 10, border: "1px solid hsl(var(--border))" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "hsl(var(--primary) / .15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{m.name}</p>
                      <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0 }}>{m.email}</p>
                    </div>
                    <button onClick={() => handleRemoveMediator(m.id)} style={{ height: 32, padding: "0 10px", borderRadius: 6, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 12, cursor: "pointer", color: "hsl(var(--destructive))" }}>
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── PARTICIPANTES ─── */}
        {tab === "participantes" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: 0 }}>Participantes</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 13, cursor: "pointer" }}>
                  <Download size={14} aria-hidden /> CSV
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

        {/* ─── INSCRIÇÕES ─── */}
        {tab === "inscricoes" && (
          <div style={{ maxWidth: 800 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: 0 }}>Inscrições</h2>
              {slug && (
                <a href={`/e/${slug}/inscricao`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13, color: "hsl(var(--foreground))", textDecoration: "none" }}>
                  <ExternalLink size={13} /> Ver formulário
                </a>
              )}
            </div>

            {/* Config */}
            <div style={{ padding: 20, background: "hsl(var(--muted) / .4)", border: "1px solid hsl(var(--border))", borderRadius: 12, marginBottom: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <Toggle
                label="Inscrições abertas"
                description="Habilita o formulário público de inscrição."
                checked={regEnabled}
                onToggle={() => setRegEnabled((v) => !v)}
              />
              {regEnabled && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Abertura das inscrições" htmlFor="reg-opens">
                    <input id="reg-opens" type="datetime-local" value={regOpensAt} onChange={(e) => setRegOpensAt(e.target.value)} style={inp} />
                  </Field>
                  <Field label="Encerramento das inscrições" htmlFor="reg-closes">
                    <input id="reg-closes" type="datetime-local" value={regClosesAt} onChange={(e) => setRegClosesAt(e.target.value)} style={inp} />
                  </Field>
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
              >
                <Save size={13} /> {saving ? "Salvando…" : "Salvar configurações"}
              </button>
            </div>

            {/* List */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{registrations.length} inscritos</p>
            </div>
            {regsLoading && <div style={{ padding: 32, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>Carregando…</div>}
            {!regsLoading && registrations.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>Nenhum inscrito ainda.</div>
            )}
            {!regsLoading && registrations.length > 0 && (
              <div style={{ border: "1px solid hsl(var(--border))", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "hsl(var(--muted))", borderBottom: "1px solid hsl(var(--border))" }}>
                      {["Nome", "E-mail", "Telefone", "CPF", "Check-in", "Kit", "Ações"].map((h) => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg, i) => (
                      <tr key={reg.id} style={{ borderBottom: i < registrations.length - 1 ? "1px solid hsl(var(--border))" : "none" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 500 }}>{reg.name}</td>
                        <td style={{ padding: "10px 14px", color: "hsl(var(--muted-foreground))" }}>{reg.email}</td>
                        <td style={{ padding: "10px 14px", color: "hsl(var(--muted-foreground))" }}>{reg.phone ?? "—"}</td>
                        <td style={{ padding: "10px 14px", color: "hsl(var(--muted-foreground))" }}>{reg.document ?? "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <Badge active={reg.checkedIn} label={reg.checkedIn ? "Sim" : "Não"} />
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <Badge active={reg.kitDelivered} label={reg.kitDelivered ? "Sim" : "Não"} />
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => toggleRegistrationField(reg, "checkedIn")} style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 11, cursor: "pointer" }}>
                              <CheckCircle2 size={11} /> {reg.checkedIn ? "Desfazer" : "Check-in"}
                            </button>
                            <button onClick={() => toggleRegistrationField(reg, "kitDelivered")} style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 11, cursor: "pointer" }}>
                              <Package size={11} /> {reg.kitDelivered ? "Desfazer kit" : "Kit"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── SORTEIO ─── */}
        {tab === "sorteio" && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: 0 }}>Sorteio</h2>
              <button onClick={handleResetDraw} style={{ height: 32, padding: "0 12px", borderRadius: 7, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 12, cursor: "pointer", color: "hsl(var(--muted-foreground))" }}>
                Resetar sorteio
              </button>
            </div>
            <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", margin: "0 0 32px" }}>
              Apenas inscritos com check-in participam. Sorteados não aparecem novamente.
            </p>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, padding: "40px 0" }}>
              {drawPhase === "idle" && (
                <button
                  onClick={handleDraw}
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 64, padding: "0 48px", borderRadius: 16, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 20, fontWeight: 700, cursor: "pointer" }}
                >
                  <Trophy size={22} aria-hidden /> Sortear
                </button>
              )}

              {drawPhase === "counting" && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 96, margin: 0, lineHeight: 1, color: "hsl(var(--primary))" }}>
                    {drawCountdown}
                  </p>
                  <p style={{ fontSize: 16, color: "hsl(var(--muted-foreground))", margin: "16px 0 0" }}>Sorteando…</p>
                </div>
              )}

              {drawPhase === "winner" && drawWinner && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "hsl(142 71% 40%)", marginBottom: 16 }}>
                    <Trophy size={28} />
                    <span style={{ fontSize: 18, fontWeight: 600 }}>Sorteado!</span>
                  </div>
                  <p style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 48, margin: "0 0 8px", lineHeight: 1.1 }}>{drawWinner.name}</p>
                  {drawRemaining !== null && (
                    <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: "0 0 32px" }}>
                      {drawRemaining} {drawRemaining === 1 ? "inscrito restante" : "inscritos restantes"}
                    </p>
                  )}
                  <button
                    onClick={() => { setDrawPhase("idle"); setDrawWinner(null); }}
                    style={{ height: 44, padding: "0 24px", borderRadius: 10, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 14, cursor: "pointer" }}
                  >
                    Novo sorteio
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── QR CODE ─── */}
        {tab === "qrcode" && (
          <div style={{ maxWidth: 500 }}>
            <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: "0 0 20px" }}>QR Code</h2>
            <div style={{ background: "#fff", border: "1px solid hsl(var(--border))", borderRadius: 16, padding: 24, textAlign: "center", marginBottom: 16 }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR Code para /e/${slug}`} width={280} height={280} style={{ display: "block", margin: "0 auto" }} />
              ) : (
                <div style={{ width: 280, height: 280, margin: "0 auto", background: "hsl(var(--muted))", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
                  {slug ? "Gerando…" : "Salve o slug primeiro"}
                </div>
              )}
            </div>
            <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: "hsl(var(--muted-foreground))", textAlign: "center", marginBottom: 16 }}>
              {window?.location?.origin ?? "https://sistema-voz-beta.vercel.app"}/e/{slug || "slug-do-evento"}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => downloadQr("png")}
                disabled={!qrDataUrl}
                style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 14, cursor: qrDataUrl ? "pointer" : "not-allowed", opacity: qrDataUrl ? 1 : 0.5 }}
              >
                <Download size={14} aria-hidden /> Baixar PNG
              </button>
            </div>
          </div>
        )}

        {/* ─── CONFIGURAÇÕES ─── */}
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
                <button onClick={handleDeleteEvent} style={{ height: 40, padding: "0 16px", borderRadius: 8, border: "1px solid hsl(var(--destructive))", background: "transparent", color: "hsl(var(--destructive))", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
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

function SectionBlock({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ padding: 20, background: "hsl(var(--muted) / .4)", border: "1px solid hsl(var(--border))", borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{title}</p>
        {action}
      </div>
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
      <Toggle checked={checked} onToggle={() => setChecked((v) => !v)} />
    </div>
  );
}

function Toggle({ label, description, checked, onToggle }: { label?: string; description?: string; checked: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, width: "100%" }}>
      {(label || description) && (
        <div>
          {label && <p style={{ fontWeight: 500, fontSize: 15, margin: "0 0 2px" }}>{label}</p>}
          {description && <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0 }}>{description}</p>}
        </div>
      )}
      <button
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        style={{ width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer", position: "relative", flexShrink: 0, background: checked ? "hsl(var(--primary))" : "hsl(var(--muted))" }}
      >
        <span style={{ position: "absolute", top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff" }} />
      </button>
    </div>
  );
}

function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: active ? "hsl(142 71% 45% / .12)" : "hsl(var(--muted))", color: active ? "hsl(142 71% 35%)" : "hsl(var(--muted-foreground))" }}>
      {label}
    </span>
  );
}
