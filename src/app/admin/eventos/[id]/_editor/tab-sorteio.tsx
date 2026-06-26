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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: 0 }}>Sorteio</h2>
        <button onClick={handleResetDraw} style={{ height: 32, padding: "0 12px", borderRadius: 7, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 12, cursor: "pointer", color: "hsl(var(--muted-foreground))" }}>
          Resetar sorteio
        </button>
      </div>
      <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", margin: "0 0 32px" }}>
        Apenas inscritos com check-in participam. Sorteados não aparecem novamente.
      </p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, padding: "40px 0" }}>
        {drawPhase === "idle" && (
          <button
            onClick={handleDraw}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 64, padding: "0 48px", borderRadius: 16, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 20, fontWeight: 700, cursor: "pointer" }}
          >
            <Trophy size={22} aria-hidden /> Sortear
          </button>
        )}

        {drawPhase === "counting" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 96, margin: 0, lineHeight: 1, color: "hsl(var(--primary))" }}>
              {drawCountdown}
            </p>
            <p style={{ fontSize: 16, color: "hsl(var(--muted-foreground))", margin: "16px 0 0" }}>Sorteando…</p>
          </div>
        )}

        {drawPhase === "winner" && drawWinner && (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "hsl(142 71% 40%)", marginBottom: 16 }}>
              <Trophy size={28} />
              <span style={{ fontSize: 18, fontWeight: 600 }}>Sorteado!</span>
            </div>
            <p style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 48, margin: "0 0 8px", lineHeight: 1.1 }}>{drawWinner.name}</p>
            {drawRemaining !== null && (
              <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: "0 0 32px" }}>
                {drawRemaining} {drawRemaining === 1 ? "inscrito restante" : "inscritos restantes"}
              </p>
            )}
            <button
              onClick={() => { setDrawPhase("idle"); setDrawWinner(null); }}
              style={{ height: 44, padding: "0 24px", borderRadius: 10, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 14, cursor: "pointer" }}
            >
              Novo sorteio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
