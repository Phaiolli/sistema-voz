import { Plus } from "lucide-react";
import { Field, smInp, type UserPublic } from "./shared";

interface NewMediator {
  name: string;
  email: string;
  password: string;
  submitting: boolean;
}

interface TabMediadoresProps {
  handleCreateMediator: (e: React.FormEvent) => void;
  newMed: NewMediator;
  setNewMed: React.Dispatch<React.SetStateAction<NewMediator>>;
  mediatorsLoading: boolean;
  mediators: UserPublic[];
  handleRemoveMediator: (userId: string) => void;
}

export function TabMediadores({ handleCreateMediator, newMed, setNewMed, mediatorsLoading, mediators, handleRemoveMediator }: TabMediadoresProps) {
  return (
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
  );
}
