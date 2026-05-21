"use client";

import { X, Download, Copy } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";

export function QRModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-title"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "hsl(var(--background))", borderRadius: 16, padding: 32, maxWidth: 480, width: "calc(100% - 40px)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 id="qr-title" style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: 0 }}>QR Code do evento</h2>
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: "4px 0 0" }}>Compartilhe com a plateia para receber perguntas.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", cursor: "pointer" }}>
            <X size={16} aria-hidden />
          </button>
        </div>

        <div style={{ background: "#fff", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 16, position: "relative", textAlign: "center" }}>
          <FakeQR size={320} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ background: "#fff", padding: "8px 12px", borderRadius: 8, border: "3px solid hsl(38 85% 58%)" }}>
              <VozWordmark size={22} />
            </div>
          </div>
        </div>

        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: "hsl(var(--muted-foreground))", textAlign: "center", margin: "12px 0 0" }}>
          voz.app/e/incluir-2025
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", cursor: "pointer", fontSize: 13 }}>
            <Download size={14} aria-hidden /> PNG
          </button>
          <button style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", cursor: "pointer", fontSize: 13 }}>
            <Download size={14} aria-hidden /> SVG
          </button>
          <button style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, borderRadius: 8, border: "none", background: "hsl(var(--muted))", cursor: "pointer", fontSize: 13 }}>
            <Copy size={14} aria-hidden /> Link
          </button>
        </div>
      </div>
    </div>
  );
}

function FakeQR({ size }: { size: number }) {
  const N = 25, cell = size / N;
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const inFinder = (r < 7 && c < 7) || (r < 7 && c >= N - 7) || (r >= N - 7 && c < 7);
      const on = inFinder
        ? (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
           (r >= N - 7 && (r === N - 1 || r === N - 7)) || (c >= N - 7 && (c === N - 1 || c === N - 7)))
        : (((r * 31 + c * 17 + r * c) % 7) < 3);
      if (on) cells.push(<rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#0A0A0A" />);
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", margin: "0 auto" }} aria-hidden>
      <rect width={size} height={size} fill="#fff" />
      {cells}
    </svg>
  );
}
