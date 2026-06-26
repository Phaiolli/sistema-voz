import { Save, CheckCircle2, Package, ExternalLink, FileDown } from "lucide-react";
import type { Registration } from "@/lib/types";
import { Field, Toggle, Badge, inp } from "./shared";

interface TabInscricoesProps {
  slug: string;
  regEnabled: boolean;
  setRegEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  regOpensAt: string;
  setRegOpensAt: (v: string) => void;
  regClosesAt: string;
  setRegClosesAt: (v: string) => void;
  handleSave: () => void;
  saving: boolean;
  registrations: Registration[];
  exportCsv: () => void;
  regsLoading: boolean;
  toggleRegistrationField: (reg: Registration, field: "checkedIn" | "kitDelivered") => void;
}

export function TabInscricoes({
  slug, regEnabled, setRegEnabled, regOpensAt, setRegOpensAt, regClosesAt, setRegClosesAt,
  handleSave, saving, registrations, exportCsv, regsLoading, toggleRegistrationField,
}: TabInscricoesProps) {
  return (
    <div style={{ maxWidth: 800 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-[22px] m-0" style={{ fontFamily: '"Archivo", sans-serif' }}>Inscrições</h2>
        {slug && (
          <a href={`/e/${slug}/inscricao`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-border text-[13px] text-foreground no-underline">
            <ExternalLink size={13} /> Ver formulário
          </a>
        )}
      </div>

      {/* Config */}
      <div className="p-5 bg-muted/40 border border-border rounded-xl mb-6 flex flex-col gap-4">
        <Toggle
          label="Inscrições abertas"
          description="Habilita o formulário público de inscrição."
          checked={regEnabled}
          onToggle={() => setRegEnabled((v) => !v)}
        />
        {regEnabled && (
          <div className="grid grid-cols-2 gap-4">
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
          className="self-start inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border-0 bg-primary text-primary-foreground text-[13px] font-semibold"
          style={{ cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          <Save size={13} /> {saving ? "Salvando…" : "Salvar configurações"}
        </button>
      </div>

      {/* List */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-[15px] m-0">{registrations.length} inscritos</p>
        {registrations.length > 0 && (
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-border bg-transparent text-[13px] cursor-pointer"
          >
            <FileDown size={14} aria-hidden /> Exportar CSV
          </button>
        )}
      </div>
      {regsLoading && <div className="p-8 text-center text-muted-foreground">Carregando…</div>}
      {!regsLoading && registrations.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">Nenhum inscrito ainda.</div>
      )}
      {!regsLoading && registrations.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-muted border-b border-border">
                {["Nome", "E-mail", "Telefone", "CPF", "Check-in", "Kit", "Ações"].map((h) => (
                  <th key={h} className="py-2.5 px-3.5 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg, i) => (
                <tr key={reg.id} className={i < registrations.length - 1 ? "border-b border-border" : undefined}>
                  <td className="py-2.5 px-3.5 font-medium">{reg.name}</td>
                  <td className="py-2.5 px-3.5 text-muted-foreground">{reg.email}</td>
                  <td className="py-2.5 px-3.5 text-muted-foreground">{reg.phone ?? "—"}</td>
                  <td className="py-2.5 px-3.5 text-muted-foreground">{reg.document ?? "—"}</td>
                  <td className="py-2.5 px-3.5">
                    <Badge active={reg.checkedIn} label={reg.checkedIn ? "Sim" : "Não"} />
                  </td>
                  <td className="py-2.5 px-3.5">
                    <Badge active={reg.kitDelivered} label={reg.kitDelivered ? "Sim" : "Não"} />
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex gap-1.5">
                      <button onClick={() => toggleRegistrationField(reg, "checkedIn")} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-transparent text-[11px] cursor-pointer">
                        <CheckCircle2 size={11} /> {reg.checkedIn ? "Desfazer" : "Check-in"}
                      </button>
                      <button onClick={() => toggleRegistrationField(reg, "kitDelivered")} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-transparent text-[11px] cursor-pointer">
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
  );
}
