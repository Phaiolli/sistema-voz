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
    <div className="flex flex-col gap-7" style={{ maxWidth: 700 }}>
      <h2 className="font-bold text-[22px] m-0" style={{ fontFamily: '"Archivo", sans-serif' }}>Página do evento</h2>

      {/* Logo */}
      <SectionBlock title="Logo do evento">
        <div className="flex items-center gap-4">
          {logo && (
            <div className="w-20 h-20 rounded-lg border border-border overflow-hidden bg-muted shrink-0 flex items-center justify-center">
              <Image src={logo} alt="Logo" width={80} height={80} className="object-contain w-full h-full" unoptimized />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" id="logo-upload" onChange={handleLogoUpload} />
            <label
              htmlFor="logo-upload"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-transparent text-[13px]"
              style={{ cursor: logoUploading ? "not-allowed" : "pointer", opacity: logoUploading ? 0.6 : 1 }}
            >
              <Upload size={14} aria-hidden /> {logoUploading ? "Enviando…" : logo ? "Trocar logo" : "Fazer upload"}
            </label>
            {logo && (
              <button onClick={() => setLogo("")} className="inline-flex items-center gap-1 text-xs text-destructive border-0 bg-none cursor-pointer p-0">
                <X size={12} /> Remover
              </button>
            )}
            <p className="text-xs text-muted-foreground m-0">PNG, JPG, SVG · max 3 MB</p>
          </div>
        </div>
      </SectionBlock>

      {/* Imagem de capa */}
      <SectionBlock title="Imagem de capa">
        <div className="flex items-start gap-4">
          {coverUrl ? (
            <div className="w-[120px] h-[68px] rounded-lg overflow-hidden border border-border shrink-0">
              <Image src={coverUrl} alt="Capa" width={120} height={68} className="object-cover w-full h-full" unoptimized />
            </div>
          ) : (
            <div className="w-[120px] h-[68px] rounded-lg border border-dashed border-border flex items-center justify-center shrink-0 text-muted-foreground">
              <ImagePlus size={22} aria-hidden />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" id="cover-upload" onChange={handleCoverUpload} />
            <label
              htmlFor="cover-upload"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-transparent text-[13px]"
              style={{ cursor: coverUploading ? "not-allowed" : "pointer", opacity: coverUploading ? 0.6 : 1 }}
            >
              <Upload size={14} aria-hidden /> {coverUploading ? "Enviando…" : coverUrl ? "Trocar capa" : "Fazer upload"}
            </label>
            {coverUrl && (
              <button onClick={() => setCoverUrl("")} className="inline-flex items-center gap-1 text-xs text-destructive border-0 bg-none cursor-pointer p-0">
                <X size={12} /> Remover
              </button>
            )}
            <p className="text-xs text-muted-foreground m-0">Exibida como banner no evento · max 3 MB</p>
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Organização" htmlFor="ev-org">
            <input id="ev-org" value={organizer} onChange={(e) => setOrganizer(e.target.value)} style={smInp} placeholder="Nome da organização" />
          </Field>
          <Field label="Instagram" htmlFor="ev-ig">
            <input id="ev-ig" value={organizerInstagram} onChange={(e) => setOrganizerInstagram(e.target.value)} style={smInp} placeholder="@handle" />
          </Field>
        </div>
      </SectionBlock>

      {/* Programação */}
      <SectionBlock title="Programação" action={<button onClick={addScheduleItem} className="inline-flex items-center gap-1 text-[13px] h-[30px] px-2.5 rounded-md border border-border bg-transparent cursor-pointer"><Plus size={12} /> Adicionar</button>}>
        <div className="flex flex-col gap-2.5">
          {schedule.length === 0 && (
            <p className="text-[13px] text-muted-foreground">Nenhum item. Clique em &quot;Adicionar&quot; para incluir.</p>
          )}
          {schedule.map((item) => (
            <div key={item.id} className="grid gap-2 items-start p-3 bg-muted rounded-lg" style={{ gridTemplateColumns: "80px 1fr 1fr auto" }}>
              <input value={item.time} onChange={(e) => updateScheduleItem(item.id, { time: e.target.value })} placeholder="14h00" style={smInp} aria-label="Horário" />
              <input value={item.title} onChange={(e) => updateScheduleItem(item.id, { title: e.target.value })} placeholder="Título" style={smInp} aria-label="Título" />
              <input value={item.description ?? ""} onChange={(e) => updateScheduleItem(item.id, { description: e.target.value })} placeholder="Descrição (opcional)" style={smInp} aria-label="Descrição" />
              <button onClick={() => removeScheduleItem(item.id)} aria-label="Remover" className="h-9 w-9 rounded-md border border-border bg-transparent cursor-pointer flex items-center justify-center text-destructive shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </SectionBlock>

      {/* Palestrantes */}
      <SectionBlock title="Palestrantes" action={<button onClick={addSpeaker} className="inline-flex items-center gap-1 text-[13px] h-[30px] px-2.5 rounded-md border border-border bg-transparent cursor-pointer"><Plus size={12} /> Adicionar</button>}>
        <div className="flex flex-col gap-3.5">
          {speakers.length === 0 && (
            <p className="text-[13px] text-muted-foreground">Nenhum palestrante. Clique em &quot;Adicionar&quot; para incluir.</p>
          )}
          {speakers.map((sp) => (
            <div key={sp.id} className="p-3.5 bg-muted rounded-lg border border-border">
              <div className="flex gap-3 items-start">
                {/* Photo */}
                <div className="shrink-0">
                  <div className="w-[60px] h-[60px] rounded-full overflow-hidden bg-background border border-border mb-1.5 flex items-center justify-center">
                    {sp.photoUrl ? (
                      <Image src={sp.photoUrl} alt={sp.name || "Palestrante"} width={60} height={60} className="object-cover w-full h-full" unoptimized />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">foto</span>
                    )}
                  </div>
                  <label className="flex items-center gap-1 text-[11px] cursor-pointer text-muted-foreground">
                    <Upload size={10} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSpeakerPhoto(sp.id, f); e.target.value = ""; }} />
                    Foto
                  </label>
                </div>
                {/* Fields */}
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input value={sp.name} onChange={(e) => updateSpeaker(sp.id, { name: e.target.value })} placeholder="Nome" style={smInp} aria-label="Nome do palestrante" />
                  <input value={sp.role} onChange={(e) => updateSpeaker(sp.id, { role: e.target.value })} placeholder="Cargo / especialidade" style={smInp} aria-label="Cargo" />
                  <textarea value={sp.bio ?? ""} onChange={(e) => updateSpeaker(sp.id, { bio: e.target.value })} placeholder="Mini bio" rows={2} style={{ ...smInp, gridColumn: "1 / -1", resize: "vertical" }} aria-label="Bio" />
                </div>
                <button onClick={() => removeSpeaker(sp.id)} aria-label="Remover palestrante" className="h-[30px] w-[30px] rounded-md border border-border bg-transparent cursor-pointer flex items-center justify-center text-destructive shrink-0">
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
