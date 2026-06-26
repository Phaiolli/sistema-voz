import { Field, Toggle, ConfigToggle, inp } from "./shared";

interface TabConfiguracoesProps {
  drawEnabled: boolean;
  setDrawEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteEvent: () => void;
}

export function TabConfiguracoes({ drawEnabled, setDrawEnabled, handleDeleteEvent }: TabConfiguracoesProps) {
  return (
    <div style={{ maxWidth: 500 }}>
      <h2 className="font-bold text-[22px] mt-0 mb-5 mx-0" style={{ fontFamily: '"Archivo", sans-serif' }}>Configurações</h2>
      <div className="flex flex-col gap-5">
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
        <div className="mt-2 p-5 bg-destructive/10 rounded-xl border border-destructive/20">
          <p className="font-semibold text-[15px] text-destructive mt-0 mb-2 mx-0">Zona de perigo</p>
          <p className="text-[13px] text-muted-foreground mt-0 mb-3 mx-0">Encerrar o evento impede novos envios de perguntas.</p>
          <button onClick={handleDeleteEvent} className="h-10 px-4 rounded-lg border border-destructive bg-transparent text-destructive text-sm font-semibold cursor-pointer">
            Encerrar evento
          </button>
        </div>
      </div>
    </div>
  );
}
