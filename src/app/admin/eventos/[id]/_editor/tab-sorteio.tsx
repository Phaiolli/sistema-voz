import { Trophy } from "lucide-react";

interface TabSorteioProps {
  handleResetDraw: () => void;
  drawPhase: "idle" | "counting" | "winner";
  setDrawPhase: (v: "idle" | "counting" | "winner") => void;
  drawCountdown: number;
  handleDraw: () => void;
  drawWinner: { id: string; name: string } | null;
  setDrawWinner: (v: { id: string; name: string } | null) => void;
  drawRemaining: number | null;
}

export function TabSorteio({ handleResetDraw, drawPhase, setDrawPhase, drawCountdown, handleDraw, drawWinner, setDrawWinner, drawRemaining }: TabSorteioProps) {
  return (
    <div style={{ maxWidth: 600 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-[22px] m-0" style={{ fontFamily: '"Archivo", sans-serif' }}>Sorteio</h2>
        <button onClick={handleResetDraw} className="h-8 px-3 rounded-md border border-border bg-transparent text-xs cursor-pointer text-muted-foreground">
          Resetar sorteio
        </button>
      </div>
      <p className="text-sm text-muted-foreground mt-0 mb-8 mx-0">
        Apenas inscritos com check-in participam. Sorteados não aparecem novamente.
      </p>

      <div className="flex flex-col items-center gap-8 py-10">
        {drawPhase === "idle" && (
          <button
            onClick={handleDraw}
            className="inline-flex items-center gap-2.5 h-16 px-12 rounded-2xl border-0 bg-primary text-primary-foreground text-xl font-bold cursor-pointer"
          >
            <Trophy size={22} aria-hidden /> Sortear
          </button>
        )}

        {drawPhase === "counting" && (
          <div className="text-center">
            <p className="text-[96px] m-0 leading-none text-primary" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
              {drawCountdown}
            </p>
            <p className="text-base text-muted-foreground mt-4 mb-0 mx-0">Sorteando…</p>
          </div>
        )}

        {drawPhase === "winner" && drawWinner && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-4" style={{ color: "hsl(142 71% 40%)" }}>
              <Trophy size={28} />
              <span className="text-lg font-semibold">Sorteado!</span>
            </div>
            <p className="text-5xl mt-0 mb-2 mx-0 leading-[1.1]" style={{ fontFamily: '"Archivo Black", sans-serif' }}>{drawWinner.name}</p>
            {drawRemaining !== null && (
              <p className="text-[13px] text-muted-foreground mt-0 mb-8 mx-0">
                {drawRemaining} {drawRemaining === 1 ? "inscrito restante" : "inscritos restantes"}
              </p>
            )}
            <button
              onClick={() => { setDrawPhase("idle"); setDrawWinner(null); }}
              className="h-11 px-6 rounded-lg border border-border bg-transparent text-sm cursor-pointer"
            >
              Novo sorteio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
