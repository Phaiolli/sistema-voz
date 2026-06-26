import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { ghostSmallStyle, outlineBtnStyle, primaryBtnStyle } from "./styles";

interface ParticipantRow {
  name: string;
  whatsapp: string | null;
  email: string | null;
  questionText: string;
  isAnonymous: boolean;
  lgpdAccepted: boolean;
}

interface RegistrationRow {
  name: string;
  email: string;
  phone: string | null;
  checkedIn: boolean;
  createdAt: string;
}

export function ExportModal({ eventId, eventSlug, onClose }: { eventId: string; eventSlug: string; onClose: () => void }) {
  const [tab, setTab] = useState<"participantes" | "inscritos">("participantes");
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/events/${eventId}/participants`).then((r) => r.json()),
      fetch(`/api/v1/events/${eventId}/registrations`).then((r) => r.json()),
    ])
      .then(([pd, rd]) => {
        setParticipants((pd as { participants: ParticipantRow[] }).participants ?? []);
        setRegistrations(
          ((rd as { registrations: RegistrationRow[] }).registrations ?? []).map((r) => ({
            name: r.name, email: r.email, phone: r.phone ?? null, checkedIn: r.checkedIn, createdAt: r.createdAt,
          }))
        );
      })
      .catch(() => toast.error("Erro ao carregar dados do evento."))
      .finally(() => setLoading(false));
  }, [eventId]);

  function downloadCsv(filename: string, lines: string[]) {
    const csv = "﻿" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  function handleDownload() {
    if (tab === "participantes") {
      const header = "Nome,WhatsApp,E-mail,Pergunta,Anônimo?,LGPD";
      const rows = participants.map((p) =>
        [p.name, p.whatsapp ?? "", p.email ?? "", p.questionText, p.isAnonymous ? "Sim" : "Não", p.lgpdAccepted ? "Sim" : "Não"]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
      downloadCsv(`participantes-${eventSlug || eventId}.csv`, [header, ...rows]);
    } else {
      const header = "Nome,E-mail,Telefone,Presença,Data de inscrição";
      const rows = registrations.map((r) =>
        [r.name, r.email, r.phone ?? "", r.checkedIn ? "Sim" : "Não", new Date(r.createdAt).toLocaleString("pt-BR")]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
      downloadCsv(`inscritos-${eventSlug || eventId}.csv`, [header, ...rows]);
    }
  }

  const isEmpty = tab === "participantes" ? participants.length === 0 : registrations.length === 0;

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/75"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <div className="flex flex-col gap-4 p-6 rounded-[14px] border border-border" style={{ background: "hsl(var(--card))", maxWidth: 680, width: "calc(100% - 32px)", maxHeight: "80dvh" }}>

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <p id="export-modal-title" className="m-0 font-semibold text-base" style={{ fontFamily: '"Archivo", sans-serif' }}>Exportar dados</p>
          <button onClick={onClose} style={{ ...ghostSmallStyle, padding: "0 10px", fontSize: 16 }} aria-label="Fechar">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-border">
          {(["participantes", "inscritos"] as const).map((t) => {
            const count = t === "participantes" ? participants.length : registrations.length;
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "8px 16px", marginBottom: -1,
                  border: "1px solid",
                  borderColor: isActive ? "hsl(var(--border))" : "transparent",
                  borderBottom: isActive ? "1px solid hsl(var(--card))" : "1px solid transparent",
                  borderRadius: "8px 8px 0 0",
                  background: isActive ? "hsl(var(--card))" : "transparent",
                  cursor: "pointer", fontSize: 13, fontWeight: isActive ? 600 : 400,
                  color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                }}
              >
                {t === "participantes" ? "Participantes" : "Inscritos"}
                {!loading && (
                  <span className="ml-1.5 text-[11px] px-1.5 py-px rounded-[10px] bg-muted text-muted-foreground">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-border">
          {loading ? (
            <div className="p-8 text-center text-[13px] text-muted-foreground">Carregando…</div>
          ) : tab === "participantes" ? (
            <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="bg-muted border-b border-border">
                  {["Nome", "WhatsApp", "E-mail", "Pergunta", "Anônimo?", "LGPD"].map((h) => (
                    <th key={h} className="py-2 px-3 text-left font-semibold text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 px-3 text-center text-muted-foreground">Nenhum participante identificado.</td></tr>
                ) : participants.map((p, i) => (
                  <tr key={i} style={{ borderTop: i === 0 ? undefined : "1px solid hsl(var(--border) / .5)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500, whiteSpace: "nowrap" }}>{p.name}</td>
                    <td style={{ padding: "8px 12px", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>{p.whatsapp ?? "—"}</td>
                    <td style={{ padding: "8px 12px", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>{p.email ?? "—"}</td>
                    <td style={{ padding: "8px 12px", color: "hsl(var(--muted-foreground))", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.questionText}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", whiteSpace: "nowrap", color: p.isAnonymous ? "hsl(var(--muted-foreground))" : "hsl(142 71% 45%)" }}>{p.isAnonymous ? "Sim" : "Não"}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", whiteSpace: "nowrap", color: p.lgpdAccepted ? "hsl(142 71% 45%)" : "hsl(var(--destructive))" }}>{p.lgpdAccepted ? "Sim" : "Não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="bg-muted border-b border-border">
                  {["Nome", "E-mail", "Telefone", "Presença"].map((h) => (
                    <th key={h} className="py-2 px-3 text-left font-semibold text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrations.length === 0 ? (
                  <tr><td colSpan={4} className="py-6 px-3 text-center text-muted-foreground">Nenhum inscrito ainda.</td></tr>
                ) : registrations.map((r, i) => (
                  <tr key={i} style={{ borderTop: i === 0 ? undefined : "1px solid hsl(var(--border) / .5)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: "8px 12px", color: "hsl(var(--muted-foreground))" }}>{r.email}</td>
                    <td style={{ padding: "8px 12px", color: "hsl(var(--muted-foreground))" }}>{r.phone ?? "—"}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", color: r.checkedIn ? "hsl(142 71% 45%)" : "hsl(var(--muted-foreground))" }}>
                      {r.checkedIn ? "Sim" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end shrink-0">
          <button onClick={onClose} style={outlineBtnStyle}>Fechar</button>
          <button
            onClick={handleDownload}
            disabled={loading || isEmpty}
            style={{ ...primaryBtnStyle, opacity: loading || isEmpty ? 0.5 : 1 }}
          >
            <Download size={14} aria-hidden /> Baixar CSV
          </button>
        </div>
      </div>
    </div>
  );
}
