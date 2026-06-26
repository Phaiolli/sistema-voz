"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";
import { HeaderControls } from "@/components/voz/header-controls";
import { generateQrWithLogo } from "@/lib/qr";
import { toast } from "sonner";
import type { Event, EventPageSpeaker, EventPageScheduleItem, Registration, RegistrationConfig } from "@/lib/types";
import { type Tab, type UserPublic } from "./_editor/shared";
import { TabGeral } from "./_editor/tab-geral";
import { TabSobre } from "./_editor/tab-sobre";
import { TabIdentidade } from "./_editor/tab-identidade";
import { TabMediadores } from "./_editor/tab-mediadores";
import { TabParticipantes } from "./_editor/tab-participantes";
import { TabInscricoes } from "./_editor/tab-inscricoes";
import { TabSorteio } from "./_editor/tab-sorteio";
import { TabQrcode } from "./_editor/tab-qrcode";
import { TabConfiguracoes } from "./_editor/tab-configuracoes";

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
  const [coverUrl, setCoverUrl] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [aboutText, setAboutText] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [organizerInstagram, setOrganizerInstagram] = useState("");
  const [speakers, setSpeakers] = useState<EventPageSpeaker[]>([]);
  const [schedule, setSchedule] = useState<EventPageScheduleItem[]>([]);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Mediadores
  const [mediators, setMediators] = useState<UserPublic[]>([]);
  const [mediatorsLoading, setMediatorsLoading] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", email: "", password: "", submitting: false });

  // QR Code
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Inscrições
  const [regEnabled, setRegEnabled] = useState(false);
  const [drawEnabled, setDrawEnabled] = useState(false);
  const [regOpensAt, setRegOpensAt] = useState("");
  const [regClosesAt, setRegClosesAt] = useState("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);

  // Participantes
  const [participants, setParticipants] = useState<{ name: string; whatsapp: string | null; email: string | null; questionText: string; isAnonymous: boolean; lgpdAccepted: boolean }[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  // Sorteio
  const [drawPhase, setDrawPhase] = useState<"idle" | "counting" | "winner">("idle");
  const [drawCountdown, setDrawCountdown] = useState(5);
  const [drawWinner, setDrawWinner] = useState<{ id: string; name: string } | null>(null);
  const [drawRemaining, setDrawRemaining] = useState<number | null>(null);

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
        setDrawEnabled(ev.config?.drawEnabled ?? false);
        const page = ev.config?.page;
        setLogo(page?.logo ?? "");
        setCoverUrl(page?.coverUrl ?? "");
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRegsLoading(true);
    fetch(`/api/v1/events/${eventId}/registrations`)
      .then((r) => r.json() as Promise<{ registrations: Registration[] }>)
      .then((d) => setRegistrations(d.registrations ?? []))
      .catch(() => toast.error("Erro ao carregar inscritos."))
      .finally(() => setRegsLoading(false));
  }, [tab, eventId]);

  useEffect(() => {
    if (tab !== "participantes") return;
    if (!eventId) return;
    let cancelled = false;
    // Estado de loading é atualizado dentro de uma função assíncrona (após o
    // primeiro await), evitando setState síncrono direto no corpo do efeito.
    (async () => {
      setParticipantsLoading(true);
      try {
        const r = await fetch(`/api/v1/events/${eventId}/participants`);
        const d = await r.json() as { participants: { name: string; whatsapp: string | null; email: string | null; questionText: string; isAnonymous: boolean; lgpdAccepted: boolean }[] };
        if (!cancelled) setParticipants(d.participants ?? []);
      } catch {
        if (!cancelled) toast.error("Erro ao carregar participantes.");
      } finally {
        if (!cancelled) setParticipantsLoading(false);
      }
    })();
    return () => { cancelled = true; };
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
            page: { logo, coverUrl, aboutText, organizer, organizerInstagram, speakers, schedule },
            registration: {
              enabled: regEnabled,
              opensAt: regOpensAt ? new Date(regOpensAt).toISOString() : undefined,
              closesAt: regClosesAt ? new Date(regClosesAt).toISOString() : undefined,
            },
            drawEnabled,
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

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const url = await uploadImage(file);
      setCoverUrl(url);
      toast.success("Imagem de capa enviada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload.");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  function exportCsv() {
    if (registrations.length === 0) return;
    const header = ["Nome", "E-mail", "Telefone", "Documento", "Presença", "Kit", "Data de inscrição"];
    const rows = registrations.map((r) => [
      r.name,
      r.email,
      r.phone ?? "",
      r.document ?? "",
      r.checkedIn ? "Sim" : "Não",
      r.kitDelivered ? "Sim" : "Não",
      new Date(r.createdAt).toLocaleString("pt-BR"),
    ]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inscritos-${slug || eventId || "evento"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
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
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="h-14 flex items-center gap-3 px-6" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <Link href="/admin/eventos" aria-label="Voltar" className="flex items-center justify-center w-9 h-9 rounded-lg no-underline text-foreground" style={{ border: "1px solid hsl(var(--border))" }}>
          <ArrowLeft size={16} aria-hidden />
        </Link>
        <VozWordmark size={20} />
        <div className="flex-1" />
        <HeaderControls />
      </header>

      <div className="px-6 flex items-center gap-2" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="flex gap-0.5 flex-1 overflow-x-auto" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-3 border-0 cursor-pointer text-sm font-medium whitespace-nowrap bg-transparent"
              style={{
                color: tab === t.id ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                borderBottom: tab === t.id ? "2px solid hsl(var(--primary))" : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2.5 shrink-0 pl-2" style={{ borderLeft: "1px solid hsl(var(--border))" }}>
          <span className="text-[13px] text-muted-foreground max-w-[180px] overflow-hidden whitespace-nowrap" style={{ textOverflow: "ellipsis" }}>
            {isNew ? "Novo evento" : eventName || "…"}
          </span>
          {!isNew && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border-0 bg-primary text-primary-foreground text-[13px] font-semibold"
              style={{ cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
            >
              <Save size={13} aria-hidden /> {saving ? "Salvando…" : "Salvar"}
            </button>
          )}
        </div>
      </div>

      <main className="max-w-[960px] mx-auto px-6 py-8" role="tabpanel">

        {tab === "geral" && (
          <TabGeral
            name={name} setName={setName}
            slug={slug} setSlug={setSlug}
            startsAt={startsAt} setStartsAt={setStartsAt}
            endsAt={endsAt} setEndsAt={setEndsAt}
            place={place} setPlace={setPlace}
            address={address} setAddress={setAddress}
          />
        )}

        {tab === "sobre" && (
          <TabSobre
            logo={logo} setLogo={setLogo} logoUploading={logoUploading}
            coverUrl={coverUrl} setCoverUrl={setCoverUrl} coverUploading={coverUploading}
            aboutText={aboutText} setAboutText={setAboutText}
            organizer={organizer} setOrganizer={setOrganizer}
            organizerInstagram={organizerInstagram} setOrganizerInstagram={setOrganizerInstagram}
            speakers={speakers} schedule={schedule}
            logoInputRef={logoInputRef} coverInputRef={coverInputRef}
            handleLogoUpload={handleLogoUpload} handleCoverUpload={handleCoverUpload}
            addSpeaker={addSpeaker} updateSpeaker={updateSpeaker} removeSpeaker={removeSpeaker}
            uploadSpeakerPhoto={uploadSpeakerPhoto}
            addScheduleItem={addScheduleItem} updateScheduleItem={updateScheduleItem} removeScheduleItem={removeScheduleItem}
          />
        )}

        {tab === "identidade" && (
          <TabIdentidade
            name={name}
            accentColor={accentColor} setAccentColor={setAccentColor}
            bgColor={bgColor} setBgColor={setBgColor}
            preset={preset} setPreset={setPreset}
          />
        )}

        {tab === "mediadores" && (
          <TabMediadores
            handleCreateMediator={handleCreateMediator}
            newMed={newMed} setNewMed={setNewMed}
            mediatorsLoading={mediatorsLoading}
            mediators={mediators}
            handleRemoveMediator={handleRemoveMediator}
          />
        )}

        {tab === "participantes" && (
          <TabParticipantes
            participants={participants}
            participantsLoading={participantsLoading}
            slug={slug}
            eventId={eventId}
          />
        )}

        {tab === "inscricoes" && (
          <TabInscricoes
            slug={slug}
            regEnabled={regEnabled} setRegEnabled={setRegEnabled}
            regOpensAt={regOpensAt} setRegOpensAt={setRegOpensAt}
            regClosesAt={regClosesAt} setRegClosesAt={setRegClosesAt}
            handleSave={handleSave} saving={saving}
            registrations={registrations} exportCsv={exportCsv}
            regsLoading={regsLoading} toggleRegistrationField={toggleRegistrationField}
          />
        )}

        {tab === "sorteio" && (
          <TabSorteio
            handleResetDraw={handleResetDraw}
            drawPhase={drawPhase} setDrawPhase={setDrawPhase}
            drawCountdown={drawCountdown}
            handleDraw={handleDraw}
            drawWinner={drawWinner} setDrawWinner={setDrawWinner}
            drawRemaining={drawRemaining}
          />
        )}

        {tab === "qrcode" && (
          <TabQrcode qrDataUrl={qrDataUrl} slug={slug} downloadQr={downloadQr} />
        )}

        {tab === "configuracoes" && (
          <TabConfiguracoes
            drawEnabled={drawEnabled} setDrawEnabled={setDrawEnabled}
            handleDeleteEvent={handleDeleteEvent}
          />
        )}

      </main>
    </div>
  );
}
