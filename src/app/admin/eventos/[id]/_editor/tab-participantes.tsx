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
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="font-bold text-[22px] m-0" style={{ fontFamily: '"Archivo", sans-serif' }}>Participantes</h2>
          <p className="text-[13px] text-muted-foreground mt-1 mb-0 mx-0">
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
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-transparent text-[13px] cursor-pointer"
        >
          <Download size={14} aria-hidden /> Exportar CSV
        </button>
      </div>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted border-b border-border">
              {["Nome", "WhatsApp", "E-mail", "Pergunta", "Anônimo?", "LGPD"].map((h) => (
                <th key={h} className="py-2.5 px-4 text-left font-semibold text-[13px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participantsLoading && (
              <tr><td colSpan={6} className="py-6 px-4 text-center text-muted-foreground text-[13px]">Carregando…</td></tr>
            )}
            {!participantsLoading && participants.length === 0 && (
              <tr><td colSpan={6} className="py-6 px-4 text-center text-muted-foreground text-[13px]">Nenhum participante ainda.</td></tr>
            )}
            {!participantsLoading && participants.map((p, i) => (
              <tr key={i} className={i === 0 ? undefined : "border-t border-border"}>
                <td className="py-2.5 px-4 font-medium whitespace-nowrap">{p.name}</td>
                <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{p.whatsapp ?? "—"}</td>
                <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{p.email ?? "—"}</td>
                <td className="py-2.5 px-4 text-muted-foreground overflow-hidden whitespace-nowrap" style={{ maxWidth: 320, textOverflow: "ellipsis" }}>{p.questionText}</td>
                <td className="py-2.5 px-4 text-center whitespace-nowrap" style={{ color: p.isAnonymous ? "hsl(var(--muted-foreground))" : "hsl(142 71% 45%)" }}>{p.isAnonymous ? "Sim" : "Não"}</td>
                <td className="py-2.5 px-4 text-center whitespace-nowrap" style={{ color: p.lgpdAccepted ? "hsl(142 71% 45%)" : "hsl(var(--destructive))" }}>{p.lgpdAccepted ? "Sim" : "Não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
