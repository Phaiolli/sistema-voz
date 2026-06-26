import { outlineBtnStyle, primaryBtnStyle } from "./styles";

export function DeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="delete-modal-title"
      style={{ position: "fixed", inset: 0, background: "hsl(var(--background) / .75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}
    >
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 14, padding: 24, maxWidth: 360, width: "calc(100% - 32px)", display: "flex", flexDirection: "column", gap: 16 }}>
        <p id="delete-modal-title" style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 16, margin: 0 }}>Apagar pergunta?</p>
        <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", margin: 0 }}>Esta ação não pode ser desfeita.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={outlineBtnStyle}>Cancelar</button>
          <button onClick={onConfirm} style={{ ...primaryBtnStyle, background: "hsl(var(--destructive))", color: "#fff", border: "none" }}>Apagar</button>
        </div>
      </div>
    </div>
  );
}
