import { ArrowLeft, ArrowRight, EyeOff, RotateCcw, Trash2, MonitorPlay, MonitorOff } from "lucide-react";
import type { Question } from "@/lib/types";
import { primaryBtnStyle, projectedBtnStyle, outlineBtnStyle, ghostSmallStyle, deleteBtnStyle } from "./styles";

export interface QuestionSlotProps {
  q: Question;
  role: "prev" | "current" | "next";
  projectedId: string | null;
  onClick?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onProject?: () => void;
  onUnproject?: () => void;
  onHide?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
}

export function QuestionSlot({ q, role, projectedId, onClick, onPrev, onNext, onProject, onUnproject, onHide, onRestore, onDelete }: QuestionSlotProps) {
  const isCurrent = role === "current";
  const isProjected = projectedId === q.id;

  const clampStyle: React.CSSProperties = {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  // Border accent colour per role
  const accentColor = isCurrent
    ? "hsl(var(--foreground))"
    : role === "prev"
      ? "hsl(var(--muted-foreground) / .35)"
      : "hsl(142 71% 45% / .6)"; // green for next

  // Label chip config
  const labelText = role === "prev" ? "Pergunta anterior" : role === "next" ? "Próxima pergunta" : null;
  const labelColor = role === "prev"
    ? { bg: "hsl(var(--muted))", text: "hsl(var(--muted-foreground))" }
    : { bg: "hsl(142 71% 45% / .15)", text: "hsl(142 71% 55%)" };

  return (
    <article
      onClick={!isCurrent ? onClick : undefined}
      onKeyDown={!isCurrent ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
      tabIndex={!isCurrent ? 0 : undefined}
      aria-label={!isCurrent ? `Ir para pergunta de ${q.authorName}` : undefined}
      style={{
        borderRadius: 10,
        border: `1px solid hsl(var(--border) / ${isCurrent ? ".8" : ".3"})`,
        borderLeft: `3px solid ${accentColor}`,
        background: isCurrent ? "hsl(var(--card))" : "transparent",
        opacity: isCurrent ? 1 : role === "prev" ? 0.5 : 0.65,
        cursor: isCurrent ? "default" : "pointer",
        position: "relative",
        outline: "none",
      }}
    >
      {/* Active projection indicator bar */}
      {isProjected && (
        <div className="absolute top-0 right-0 left-[3px] h-0.5 bg-primary" aria-hidden />
      )}

      {/* Position label chip */}
      {labelText && (
        <div className="pt-1.5 px-3">
          <span style={{
            display: "inline-block", padding: "1px 7px", borderRadius: 4,
            background: labelColor.bg, color: labelColor.text,
            fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            {labelText}
          </span>
        </div>
      )}

      {/* Card header */}
      <div style={{ padding: isCurrent ? "12px 16px 0" : "4px 12px 0", display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap" }}>
        <span style={{ fontSize: isCurrent ? 14 : 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{q.authorName}</span>
        <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginLeft: "auto", flexShrink: 0 }}>{formatRelative(q.createdAt)}</span>
        {isCurrent && (
          <>
            <button onClick={onDelete} style={deleteBtnStyle} aria-label="Apagar pergunta permanentemente">
              <Trash2 size={13} aria-hidden />
            </button>
            {q.status === "hidden"
              ? <button onClick={onRestore} style={ghostSmallStyle} aria-label="Restaurar pergunta">
                  <RotateCcw size={13} aria-hidden /> Restaurar
                </button>
              : <button onClick={onHide} style={ghostSmallStyle} aria-label="Ocultar pergunta">
                  <EyeOff size={13} aria-hidden /> Ocultar
                </button>
            }
          </>
        )}
      </div>

      {/* Question text */}
      <div style={{ padding: isCurrent ? "10px 16px" : "4px 12px 10px" }}>
        <p style={{
          fontFamily: '"Archivo", sans-serif',
          fontWeight: isCurrent ? 500 : 400,
          fontSize: isCurrent ? "clamp(18px, 2.2vw, 28px)" : 13,
          lineHeight: 1.35,
          margin: 0,
          color: q.status === "answered" || q.status === "hidden" ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
          ...(!isCurrent ? clampStyle : {}),
        }}>
          {q.text}
        </p>
      </div>

      {/* Action bar — single row, never wraps */}
      {isCurrent && (
        <div className="flex gap-2 border-t border-border" style={{ padding: "10px 16px 14px" }}>
          <button
            onClick={onPrev}
            disabled={!onPrev}
            style={{ ...outlineBtnStyle, opacity: onPrev ? 1 : 0.35, flex: 1, justifyContent: "center", minWidth: 0 }}
            aria-label="Pergunta anterior"
          >
            <ArrowLeft size={14} aria-hidden /> <span className="nav-lbl">Anterior</span>
          </button>
          {q.status !== "hidden"
            ? isProjected
              ? <button onClick={onUnproject} style={{ ...projectedBtnStyle, flex: 2, justifyContent: "center", minWidth: 0 }} aria-label="Retirar do projetor">
                  <MonitorOff size={14} aria-hidden /> <span className="nav-lbl">Retirar</span>
                </button>
              : <button onClick={onProject} style={{ ...primaryBtnStyle, flex: 2, justifyContent: "center", minWidth: 0 }} aria-label="Projetar esta pergunta">
                  <MonitorPlay size={14} aria-hidden /> <span className="nav-lbl">Projetar</span>
                </button>
            : <div style={{ flex: 2 }} />
          }
          <button
            onClick={onNext}
            disabled={!onNext}
            style={{ ...outlineBtnStyle, opacity: onNext ? 1 : 0.35, flex: 1, justifyContent: "center", minWidth: 0 }}
            aria-label="Próxima pergunta"
          >
            <span className="nav-lbl">Próxima</span> <ArrowRight size={14} aria-hidden />
          </button>
        </div>
      )}
    </article>
  );
}

function formatRelative(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "agora";
  if (diff === 1) return "há 1 min";
  if (diff < 60) return `há ${diff} min`;
  return `há ${Math.floor(diff / 60)}h`;
}
