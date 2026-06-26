import { outlineBtnStyle, primaryBtnStyle } from "./styles";

export function DeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/75"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <div className="flex flex-col gap-4 p-6 rounded-[14px] border border-border" style={{ background: "hsl(var(--card))", maxWidth: 360, width: "calc(100% - 32px)" }}>
        <p id="delete-modal-title" className="m-0 font-semibold text-base" style={{ fontFamily: '"Archivo", sans-serif' }}>Apagar pergunta?</p>
        <p className="m-0 text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} style={outlineBtnStyle}>Cancelar</button>
          <button onClick={onConfirm} style={{ ...primaryBtnStyle, background: "hsl(var(--destructive))", color: "#fff", border: "none" }}>Apagar</button>
        </div>
      </div>
    </div>
  );
}
