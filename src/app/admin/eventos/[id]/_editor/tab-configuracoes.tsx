import { Field, Toggle, ConfigToggle, inp } from "./shared";

interface TabConfiguracoesProps {
  drawEnabled: boolean;
  setDrawEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteEvent: () => void;
}

export function TabConfiguracoes({ drawEnabled, setDrawEnabled, handleDeleteEvent }: TabConfiguracoesProps) {
  return (
    <div style={{ maxWidth: 500 }}>
      <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: "0 0 20px" }}>Configurações</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Field label="Máximo de perguntas por participante" htmlFor="cfg-max">
          <input id="cfg-max" type="number" defaultValue={5} min={1} max={20} style={{ ...inp, width: 80 }} />
        </Field>
        <ConfigToggle label="Moderação manual" description="O mediador aprova cada pergunta antes de exibir." defaultChecked />
        <ConfigToggle label="Permitir anônimos" description="Participantes podem enviar sem identificação." defaultChecked />
        <ConfigToggle label="LGPD obrigatório" description="Exige aceite antes do envio." defaultChecked />
        <Toggle
          label="Habilitar sorteio"
          description="Permite que o mediador realize sorteios entre os inscritos durante o evento."
          checked={drawEnabled}
          onToggle={() => setDrawEnabled((v) => !v)}
        />
        <div style={{ marginTop: 8, padding: 20, background: "hsl(var(--destructive) / .08)", border: "1px solid hsl(var(--destructive) / .2)", borderRadius: 12 }}>
          <p style={{ fontWeight: 600, fontSize: 15, color: "hsl(var(--destructive))", margin: "0 0 8px" }}>Zona de perigo</p>
          <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: "0 0 12px" }}>Encerrar o evento impede novos envios de perguntas.</p>
          <button onClick={handleDeleteEvent} style={{ height: 40, padding: "0 16px", borderRadius: 8, border: "1px solid hsl(var(--destructive))", background: "transparent", color: "hsl(var(--destructive))", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Encerrar evento
          </button>
        </div>
      </div>
    </div>
  );
}
