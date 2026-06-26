import { Download } from "lucide-react";

interface ParticipantRow {
  name: string;
  whatsapp: string | null;
  email: string | null;
  questionText: string;
  isAnonymous: boolean;
  lgpdAccepted: boolean;
}

interface TabParticipantesProps {
  participants: ParticipantRow[];
  participantsLoading: boolean;
  slug: string;
  eventId: string | null;
}

export function TabParticipantes({ participants, participantsLoading, slug, eventId }: TabParticipantesProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: 0 }}>Participantes</h2>
          <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: "4px 0 0" }}>
            Pessoas que enviaram perguntas neste evento — {participants.length} no total.
          </p>
        </div>
        <button
          onClick={() => {
            if (participants.length === 0) return;
            const header = "Nome,WhatsApp,E-mail,Pergunta,Anônimo?,LGPD";
            const rows = participants.map((p) =>
              [p.name, p.whatsapp ?? "", p.email ?? "", p.questionText, p.isAnonymous ? "Sim" : "Não", p.lgpdAccepted ? "Sim" : "Não"].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
            );
            const csv = "﻿" + [header, ...rows].join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `participantes-${slug || eventId}.csv`;
            a.click();
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 13, cursor: "pointer" }}
        >
          <Download size={14} aria-hidden /> Exportar CSV
        </button>
      </div>
      <div style={{ border: "1px solid hsl(var(--border))", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "hsl(var(--muted))", borderBottom: "1px solid hsl(var(--border))" }}>
              {["Nome", "WhatsApp", "E-mail", "Pergunta", "Anônimo?", "LGPD"].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participantsLoading && (
              <tr><td colSpan={6} style={{ padding: "24px 16px", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>Carregando…</td></tr>
            )}
            {!participantsLoading && participants.length === 0 && (
              <tr><td colSpan={6} style={{ padding: "24px 16px", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>Nenhum participante ainda.</td></tr>
            )}
            {!participantsLoading && participants.map((p, i) => (
              <tr key={i} style={{ borderTop: i === 0 ? undefined : "1px solid hsl(var(--border))" }}>
                <td style={{ padding: "10px 16px", fontWeight: 500, whiteSpace: "nowrap" }}>{p.name}</td>
                <td style={{ padding: "10px 16px", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>{p.whatsapp ?? "—"}</td>
                <td style={{ padding: "10px 16px", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>{p.email ?? "—"}</td>
                <td style={{ padding: "10px 16px", color: "hsl(var(--muted-foreground))", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.questionText}</td>
                <td style={{ padding: "10px 16px", textAlign: "center", whiteSpace: "nowrap", color: p.isAnonymous ? "hsl(var(--muted-foreground))" : "hsl(142 71% 45%)" }}>{p.isAnonymous ? "Sim" : "Não"}</td>
                <td style={{ padding: "10px 16px", textAlign: "center", whiteSpace: "nowrap", color: p.lgpdAccepted ? "hsl(142 71% 45%)" : "hsl(var(--destructive))" }}>{p.lgpdAccepted ? "Sim" : "Não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
