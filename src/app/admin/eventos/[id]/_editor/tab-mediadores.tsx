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
      <h2 className="font-bold text-[22px] mt-0 mb-5 mx-0" style={{ fontFamily: '"Archivo", sans-serif' }}>Mediadores</h2>

      {/* Create form */}
      <form onSubmit={handleCreateMediator} className="p-4 bg-muted rounded-lg border border-border mb-6 flex flex-col gap-3">
        <p className="text-sm font-semibold m-0">Novo mediador</p>
        <div className="grid grid-cols-2 gap-2.5">
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
          className="self-start inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border-0 bg-primary text-primary-foreground text-[13px] font-semibold"
          style={{ cursor: newMed.submitting ? "not-allowed" : "pointer", opacity: newMed.submitting ? 0.7 : 1 }}
        >
          <Plus size={14} aria-hidden /> {newMed.submitting ? "Criando…" : "Criar e atribuir"}
        </button>
      </form>

      {/* List */}
      {mediatorsLoading && <div className="p-6 text-center text-muted-foreground">Carregando…</div>}
      {!mediatorsLoading && (
        <div className="flex flex-col gap-2">
          {mediators.length === 0 && (
            <p className="text-sm text-muted-foreground text-center p-6">Nenhum mediador atribuído.</p>
          )}
          {mediators.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-3 px-4 bg-muted rounded-lg border border-border">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold shrink-0">
                {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm m-0">{m.name}</p>
                <p className="text-xs text-muted-foreground m-0">{m.email}</p>
              </div>
              <button onClick={() => handleRemoveMediator(m.id)} className="h-8 px-2.5 rounded-md border border-border bg-transparent text-xs cursor-pointer text-destructive">
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
