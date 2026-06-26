import Image from "next/image";
import { Plus, X, Upload, ImagePlus } from "lucide-react";
import type { EventPageSpeaker, EventPageScheduleItem } from "@/lib/types";
import { Field, SectionBlock, smInp } from "./shared";

interface TabSobreProps {
  logo: string;
  setLogo: (v: string) => void;
  logoUploading: boolean;
  coverUrl: string;
  setCoverUrl: (v: string) => void;
  coverUploading: boolean;
  aboutText: string;
  setAboutText: (v: string) => void;
  organizer: string;
  setOrganizer: (v: string) => void;
  organizerInstagram: string;
  setOrganizerInstagram: (v: string) => void;
  speakers: EventPageSpeaker[];
  schedule: EventPageScheduleItem[];
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  coverInputRef: React.RefObject<HTMLInputElement | null>;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addSpeaker: () => void;
  updateSpeaker: (id: string, patch: Partial<EventPageSpeaker>) => void;
  removeSpeaker: (id: string) => void;
  uploadSpeakerPhoto: (speakerId: string, file: File) => void;
  addScheduleItem: () => void;
  updateScheduleItem: (id: string, patch: Partial<EventPageScheduleItem>) => void;
  removeScheduleItem: (id: string) => void;
}

export function TabSobre({
  logo, setLogo, logoUploading, coverUrl, setCoverUrl, coverUploading,
  aboutText, setAboutText, organizer, setOrganizer, organizerInstagram, setOrganizerInstagram,
  speakers, schedule, logoInputRef, coverInputRef, handleLogoUpload, handleCoverUpload,
  addSpeaker, updateSpeaker, removeSpeaker, uploadSpeakerPhoto,
  addScheduleItem, updateScheduleItem, removeScheduleItem,
}: TabSobreProps) {
  return (
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

      {/* Imagem de capa */}
      <SectionBlock title="Imagem de capa">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          {coverUrl ? (
            <div style={{ width: 120, height: 68, borderRadius: 8, overflow: "hidden", border: "1px solid hsl(var(--border))", flexShrink: 0 }}>
              <Image src={coverUrl} alt="Capa" width={120} height={68} style={{ objectFit: "cover", width: "100%", height: "100%" }} unoptimized />
            </div>
          ) : (
            <div style={{ width: 120, height: 68, borderRadius: 8, border: "1px dashed hsl(var(--border))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "hsl(var(--muted-foreground))" }}>
              <ImagePlus size={22} aria-hidden />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }} id="cover-upload" onChange={handleCoverUpload} />
            <label
              htmlFor="cover-upload"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 13, cursor: coverUploading ? "not-allowed" : "pointer", opacity: coverUploading ? 0.6 : 1 }}
            >
              <Upload size={14} aria-hidden /> {coverUploading ? "Enviando…" : coverUrl ? "Trocar capa" : "Fazer upload"}
            </label>
            {coverUrl && (
              <button onClick={() => setCoverUrl("")} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "hsl(var(--destructive))", border: "none", background: "none", cursor: "pointer", padding: 0 }}>
                <X size={12} /> Remover
              </button>
            )}
            <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0 }}>Exibida como banner no evento · max 3 MB</p>
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
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Nenhum item. Clique em &quot;Adicionar&quot; para incluir.</p>
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
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Nenhum palestrante. Clique em &quot;Adicionar&quot; para incluir.</p>
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
  );
}
