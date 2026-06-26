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
        {registrations.length > 0 && (
          <button
            onClick={exportCsv}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 13, cursor: "pointer" }}
          >
            <FileDown size={14} aria-hidden /> Exportar CSV
          </button>
        )}
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
  );
}
