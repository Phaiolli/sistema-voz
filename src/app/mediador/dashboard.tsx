"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ExternalLink, QrCode, ArrowLeft, ArrowRight, EyeOff, RotateCcw, Trash2, MonitorPlay, MonitorOff, Download } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";
import { HeaderControls } from "@/components/voz/header-controls";
import { createBrowserClient } from "@/lib/supabase";
import { signOut, useSession } from "next-auth/react";
import type { Question, QuestionStatus } from "@/lib/types";
import { questionBroadcastSchema, questionDeletedBroadcastSchema, type QuestionBroadcast } from "@/lib/schemas";
import { QRModal } from "./qr-modal";
import { toast } from "sonner";

/**
 * Builds a {@link Question} from a validated public broadcast payload. PII
 * fields (contact/email) are never broadcast, so they default to undefined; the
 * `lgpdAccepted` marker defaults to `true` (the question only exists because it
 * was accepted on submission).
 */
function questionFromBroadcast(payload: QuestionBroadcast): Question {
  return {
    id: payload.id,
    eventId: payload.eventId,
    authorName: payload.authorName,
    text: payload.text,
    status: payload.status,
    isAnonymous: payload.isAnonymous,
    lgpdAccepted: true,
    createdAt: payload.createdAt,
  };
}

type Tab = "unread" | "all" | "hidden";

interface EventSummary {
  id: string;
  slug: string;
  name: string;
  config?: { drawEnabled?: boolean };
  theme?: { background?: string; accent?: string; logoUrl?: string };
}

interface Assignment {
  eventId: string;
  event: EventSummary;
  assignedAt: string;
}

interface AssignmentsResponse {
  events?: EventSummary[];
  assignments?: Assignment[];
}

interface ParticipantRow {
  name: string;
  whatsapp: string | null;
  email: string | null;
  questionText: string;
  isAnonymous: boolean;
  lgpdAccepted: boolean;
}

interface RegistrationRow {
  name: string;
  email: string;
  phone: string | null;
  checkedIn: boolean;
  createdAt: string;
}

export function MediatorDashboard() {
  // Todos os hooks devem vir antes de qualquer return antecipado
  useSession();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("unread");
  const [selectedId, setSelectedId] = useState<string>("");
  const [projectedId, setProjectedId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string>("");
  const [eventSlug, setEventSlug] = useState<string>("");
  const [noEvent, setNoEvent] = useState(false);
  const apresentarChannelRef = useRef<RealtimeChannel | null>(null);
  const [eventTheme, setEventTheme] = useState<{ background?: string; accent?: string; logoUrl?: string }>({});

  useEffect(() => {
    fetch("/api/v1/me/assignments")
      .then((r) => {
        if (!r.ok) throw new Error("Falha");
        return r.json();
      })
      .then((data: AssignmentsResponse) => {
        let id: string | null = null;
        let name = "";
        let slug = "";
        if (data.events && data.events.length > 0) {
          id = data.events[0].id;
          name = data.events[0].name;
          slug = data.events[0].slug;
        } else if (data.assignments && data.assignments.length > 0) {
          id = data.assignments[0].event.id;
          name = data.assignments[0].event.name;
          slug = data.assignments[0].event.slug;
        }
        if (!id) {
          setNoEvent(true);
          setLoading(false);
          return;
        }
        setEventId(id);
        setEventName(name);
        setEventSlug(slug);
        const evData = data.events?.[0] ?? data.assignments?.[0]?.event;
        if (evData?.theme) setEventTheme(evData.theme);
        return fetch(`/api/v1/events/${id}/questions`);
      })
      .then((r) => {
        if (!r) return null;
        if (!r.ok) throw new Error("Falha ao carregar perguntas");
        return r.json();
      })
      .then((data: { questions?: Question[] } | null) => {
        if (data?.questions?.length) {
          setQuestions(data.questions);
          const firstPending = [...data.questions]
            .filter((q) => q.status === "pending" || q.status === "next")
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
          setSelectedId(firstPending?.id ?? data.questions[0]?.id ?? "");
        }
      })
      .catch(() => toast.error("Erro ao carregar dados do evento."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const supabase = createBrowserClient();
    const channel = supabase.channel(`event:${eventId}:questions`)
      .on("broadcast", { event: "question:new" }, ({ payload }) => {
        const parsed = questionBroadcastSchema.safeParse(payload);
        if (!parsed.success) return;
        setQuestions((qs) => [questionFromBroadcast(parsed.data), ...qs]);
        toast("Nova pergunta recebida.");
      })
      .on("broadcast", { event: "question:updated" }, ({ payload }) => {
        const parsed = questionBroadcastSchema.safeParse(payload);
        if (!parsed.success) return;
        const incoming = parsed.data;
        // Preserve any moderator-only fields already loaded; overwrite the
        // public fields carried by the broadcast.
        setQuestions((qs) => qs.map((q) => q.id === incoming.id ? { ...q, ...questionFromBroadcast(incoming) } : q));
      })
      .on("broadcast", { event: "question:deleted" }, ({ payload }) => {
        const parsed = questionDeletedBroadcastSchema.safeParse(payload);
        if (!parsed.success) return;
        const { id } = parsed.data;
        setQuestions((qs) => qs.filter((q) => q.id !== id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const supabase = createBrowserClient();
    const ch = supabase.channel(`event:${eventId}:apresentar`).subscribe();
    apresentarChannelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      apresentarChannelRef.current = null;
    };
  }, [eventId]);

  const listed = useMemo(() => {
    // "unread" = all non-hidden (answered stays visible — it's only a moderator marker)
    const base =
      tab === "unread" ? questions.filter((q) => q.status !== "hidden")
      : tab === "all" ? questions
      : questions.filter((q) => q.status === "hidden");
    return [...base].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [questions, tab]);

  const currentIdx = useMemo(() => {
    const idx = listed.findIndex((q) => q.id === selectedId);
    return idx >= 0 ? idx : 0;
  }, [listed, selectedId]);

  // Window: 2 previous + current + 3 next
  const prevQuestions = useMemo(
    () => listed.slice(Math.max(0, currentIdx - 2), currentIdx),
    [listed, currentIdx]
  );
  const currentQ = listed[currentIdx] ?? null;
  const nextQuestions = useMemo(
    () => listed.slice(currentIdx + 1),
    [listed, currentIdx]
  );

  // Immediate neighbours for navigation / advance
  const prevQ = prevQuestions[prevQuestions.length - 1] ?? null;
  const nextQ = nextQuestions[0] ?? null;

  const [loadedAt] = useState(() => Date.now());
  const newBadge = useMemo(() => {
    const cutoff = new Date(loadedAt - 5 * 60000);
    return questions.filter(
      (q) => q.status === "pending" && new Date(q.createdAt) > cutoff
    ).length;
  }, [questions, loadedAt]);

  const counts = useMemo(() => ({
    unread: questions.filter((q) => q.status !== "hidden").length,
    all: questions.length,
    hidden: questions.filter((q) => q.status === "hidden").length,
    answered: questions.filter((q) => q.status === "answered").length,
    pending: questions.filter((q) => q.status === "pending" || q.status === "next").length,
  }), [questions]);

  const goNext = useCallback(() => {
    if (nextQ) setSelectedId(nextQ.id);
  }, [nextQ]);

  const goPrev = useCallback(() => {
    if (prevQ) setSelectedId(prevQ.id);
  }, [prevQ]);

  const unprojectQuestion = useCallback(() => {
    setProjectedId(null);
    apresentarChannelRef.current?.send({
      type: "broadcast", event: "state",
      payload: { phase: "waiting" },
    });
  }, []);

  const projectQuestion = useCallback((q: Question) => {
    setProjectedId(q.id);
    apresentarChannelRef.current?.send({
      type: "broadcast", event: "state",
      payload: {
        phase: "showing",
        question: {
          id: q.id,
          text: q.text,
          authorName: (q.isAnonymous || q.authorName === "Anônimo") ? "Anônimo" : q.authorName,
        },
      },
    });
  }, []);

  const applyAction = useCallback(async (id: string, action: "markAnswered" | "hide" | "restore") => {
    const patchMap: Record<string, Partial<Question>> = {
      markAnswered: { status: "answered" as QuestionStatus, answeredAt: new Date().toISOString() },
      hide: { status: "hidden" as QuestionStatus, hiddenAt: new Date().toISOString() },
      restore: { status: "pending" as QuestionStatus, answeredAt: undefined },
    };
    // Save previous state for rollback
    const prev = questions.find((q) => q.id === id);
    setQuestions((qs) => qs.map((q) => q.id === id ? { ...q, ...patchMap[action] } : q));
    if (projectedId === id && action === "hide") {
      unprojectQuestion();
    }
    try {
      const res = await fetch(`/api/v1/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // Revert optimistic update on failure
      if (prev) setQuestions((qs) => qs.map((q) => q.id === id ? prev : q));
      toast.error("Erro ao salvar. Tente novamente.");
    }
  }, [questions, projectedId, unprojectQuestion]);

  const hideAndAdvance = useCallback(async (id: string) => {
    if (nextQ) setSelectedId(nextQ.id);
    else if (prevQ) setSelectedId(prevQ.id);
    await applyAction(id, "hide");
  }, [nextQ, prevQ, applyAction]);

  const deleteQuestion = useCallback(async (id: string) => {
    setDeleteTargetId(null);
    if (nextQ) setSelectedId(nextQ.id);
    else if (prevQ) setSelectedId(prevQ.id);
    setQuestions((qs) => qs.filter((q) => q.id !== id));
    try {
      const res = await fetch(`/api/v1/questions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha");
    } catch {
      toast.error("Erro ao apagar. Atualize a página.");
    }
  }, [nextQ, prevQ]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
      if (e.key === "p" && currentQ) {
        e.preventDefault();
        if (projectedId === currentQ.id) unprojectQuestion();
        else projectQuestion(currentQ);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [goNext, goPrev, currentQ, projectedId, projectQuestion, unprojectQuestion]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--muted-foreground))", fontSize: 15 }}>
        Carregando evento…
      </div>
    );
  }

  if (noEvent) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))", gap: 16, textAlign: "center", padding: 24 }}>
        <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 20, margin: 0 }}>Nenhum evento atribuído.</p>
        <p style={{ fontSize: 15, color: "hsl(var(--muted-foreground))", margin: 0 }}>Entre em contato com o administrador.</p>
        <button
          onClick={() => signOut()}
          style={{ marginTop: 8, height: 40, padding: "0 20px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 14, cursor: "pointer", color: "hsl(var(--foreground))" }}
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

      {/* Header — mesmo padrão do admin */}
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0, background: "hsl(var(--background))", zIndex: 10 }}>
        <VozWordmark size={20} />
        <div style={{ flex: 1 }} />
        {newBadge > 0 && (
          <span aria-live="polite" aria-atomic="true" style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: "hsl(var(--accent) / .15)", color: "hsl(38 85% 32%)", fontSize: 13, fontWeight: 600, animation: "pulse 2s infinite", flexShrink: 0 }}>
            {newBadge} nova{newBadge > 1 ? "s" : ""}
          </span>
        )}
        <HeaderControls />
      </header>

      {/* Sub-nav: tabs + ações — mesmo padrão do admin */}
      <div style={{ borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 16px", flexShrink: 0, background: "hsl(var(--background))", overflowX: "auto", scrollbarWidth: "none", gap: 0 }}>
        {/* Tabs de filtro */}
        <MedTab label="Perguntas" count={counts.unread} active={tab === "unread"} onClick={() => setTab("unread")} />
        <MedTab label="Todas" count={counts.all} active={tab === "all"} onClick={() => setTab("all")} />
        <MedTab label="Ocultas" count={counts.hidden} active={tab === "hidden"} onClick={() => setTab("hidden")} />

        <div style={{ flex: 1 }} />

        {/* Botões de ação */}
        <div style={{ display: "flex", gap: 6, padding: "8px 0", flexShrink: 0 }}>
          {eventName && (
            <span className="med-event-name" style={{ alignSelf: "center", fontSize: 13, color: "hsl(var(--muted-foreground))", fontWeight: 500, whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
              {eventName}
            </span>
          )}
          <button onClick={() => setQrOpen(true)} style={subnavBtnStyle} aria-label="QR Code do evento">
            <QrCode size={15} aria-hidden />
            <span className="med-btn-lbl">QR Code</span>
          </button>
          <button onClick={() => eventId && window.open(`/apresentar/${eventId}`, "_blank")} style={subnavBtnStyle} aria-label="Link de projeção">
            <ExternalLink size={15} aria-hidden />
            <span className="med-btn-lbl">Projetar</span>
          </button>
          <button onClick={() => setExportModalOpen(true)} style={subnavBtnStyle} aria-label="Exportar dados">
            <Download size={15} aria-hidden />
            <span className="med-btn-lbl">Exportar</span>
          </button>
        </div>
      </div>

      {/* Main: single column — up to 2 prev + current + up to 3 next */}
      <main className="med-main-content" style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6, width: "100%", boxSizing: "border-box" }}>
        {listed.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", gap: 8, color: "hsl(var(--muted-foreground))" }}>
            <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 16, color: "hsl(var(--foreground))", margin: 0 }}>Sem perguntas aqui</p>
            <p style={{ fontSize: 13, margin: 0 }}>Compartilhe o QR Code com a plateia.</p>
          </div>
        )}

        {prevQuestions.map((q) => (
          <QuestionSlot
            key={q.id}
            q={q}
            role="prev"
            projectedId={projectedId}
            onClick={() => setSelectedId(q.id)}
          />
        ))}

        {currentQ && (
          <QuestionSlot
            q={currentQ}
            role="current"
            projectedId={projectedId}
            onPrev={prevQ ? goPrev : undefined}
            onNext={nextQ ? goNext : undefined}
            onProject={() => projectQuestion(currentQ)}
            onUnproject={unprojectQuestion}
            onHide={() => hideAndAdvance(currentQ.id)}
            onRestore={() => applyAction(currentQ.id, "restore")}
            onDelete={() => setDeleteTargetId(currentQ.id)}
          />
        )}

        {nextQuestions.map((q) => (
          <QuestionSlot
            key={q.id}
            q={q}
            role="next"
            projectedId={projectedId}
            onClick={() => setSelectedId(q.id)}
          />
        ))}
      </main>

      {qrOpen && <QRModal slug={eventSlug} eventName={eventName} theme={eventTheme} onClose={() => setQrOpen(false)} />}
      {exportModalOpen && eventId && (
        <ExportModal
          eventId={eventId}
          eventSlug={eventSlug}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      {deleteTargetId && (
        <DeleteModal
          onConfirm={() => deleteQuestion(deleteTargetId)}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .nav-lbl { display: inline; }
        .med-btn-lbl { display: inline; }
        .med-event-name { display: inline-block; }
        @media (max-width: 480px) {
          .nav-lbl { display: none; }
        }
        @media (max-width: 639px) {
          .med-btn-lbl { display: none; }
          .med-event-name { display: none; }
          .med-main-content { padding-bottom: 80px; }
        }
      `}</style>
    </div>
  );
}

interface QuestionSlotProps {
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

function QuestionSlot({ q, role, projectedId, onClick, onPrev, onNext, onProject, onUnproject, onHide, onRestore, onDelete }: QuestionSlotProps) {
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
        <div style={{ position: "absolute", top: 0, left: 3, right: 0, height: 2, background: "hsl(var(--primary))" }} aria-hidden />
      )}

      {/* Position label chip */}
      {labelText && (
        <div style={{ padding: "6px 12px 0 12px" }}>
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
        <div style={{ padding: "10px 16px 14px", borderTop: "1px solid hsl(var(--border))", display: "flex", gap: 8 }}>
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

const subnavBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px", borderRadius: 8, border: "1px solid hsl(var(--border))", cursor: "pointer", fontSize: 13, fontWeight: 500, background: "transparent", color: "hsl(var(--foreground))", flexShrink: 0 };
const primaryBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, height: 44, padding: "0 16px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", flexShrink: 0 };
const projectedBtnStyle: React.CSSProperties = { ...primaryBtnStyle, background: "hsl(var(--primary) / .12)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / .35)" };
const secondaryBtnStyle: React.CSSProperties = { ...primaryBtnStyle, background: "hsl(var(--muted))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" };
const outlineBtnStyle: React.CSSProperties = { ...primaryBtnStyle, background: "transparent", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" };
const ghostSmallStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, height: 32, padding: "0 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: "transparent", color: "hsl(var(--muted-foreground))", flexShrink: 0 };
const deleteBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 9, border: "1px solid hsl(var(--destructive) / .3)", cursor: "pointer", background: "transparent", color: "hsl(var(--destructive))", flexShrink: 0 };
const toolBtnStyle: React.CSSProperties = { display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "7px 16px", borderRadius: 8, border: "1px solid hsl(var(--border))", cursor: "pointer", fontSize: 11, fontWeight: 500, background: "transparent", color: "hsl(var(--foreground))", minWidth: 64, flexShrink: 0 };

function MedTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "12px 14px", marginBottom: -1,
        border: "none", borderBottom: active ? "2px solid hsl(var(--primary))" : "2px solid transparent",
        background: "transparent", cursor: "pointer",
        fontSize: 14, fontWeight: active ? 600 : 500,
        color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        flexShrink: 0, whiteSpace: "nowrap",
      }}
    >
      {label}
      <span style={{
        fontSize: 11, padding: "1px 6px", borderRadius: 10,
        background: active ? "hsl(var(--primary) / .12)" : "hsl(var(--muted))",
        color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        fontVariantNumeric: "tabular-nums",
      }}>
        {count}
      </span>
    </button>
  );
}


function ExportModal({ eventId, eventSlug, onClose }: { eventId: string; eventSlug: string; onClose: () => void }) {
  const [tab, setTab] = useState<"participantes" | "inscritos">("participantes");
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/events/${eventId}/participants`).then((r) => r.json()),
      fetch(`/api/v1/events/${eventId}/registrations`).then((r) => r.json()),
    ])
      .then(([pd, rd]) => {
        setParticipants((pd as { participants: ParticipantRow[] }).participants ?? []);
        setRegistrations(
          ((rd as { registrations: RegistrationRow[] }).registrations ?? []).map((r) => ({
            name: r.name, email: r.email, phone: r.phone ?? null, checkedIn: r.checkedIn, createdAt: r.createdAt,
          }))
        );
      })
      .catch(() => toast.error("Erro ao carregar dados do evento."))
      .finally(() => setLoading(false));
  }, [eventId]);

  function downloadCsv(filename: string, lines: string[]) {
    const csv = "﻿" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  function handleDownload() {
    if (tab === "participantes") {
      const header = "Nome,WhatsApp,E-mail,Pergunta,Anônimo?,LGPD";
      const rows = participants.map((p) =>
        [p.name, p.whatsapp ?? "", p.email ?? "", p.questionText, p.isAnonymous ? "Sim" : "Não", p.lgpdAccepted ? "Sim" : "Não"]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
      downloadCsv(`participantes-${eventSlug || eventId}.csv`, [header, ...rows]);
    } else {
      const header = "Nome,E-mail,Telefone,Presença,Data de inscrição";
      const rows = registrations.map((r) =>
        [r.name, r.email, r.phone ?? "", r.checkedIn ? "Sim" : "Não", new Date(r.createdAt).toLocaleString("pt-BR")]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
      downloadCsv(`inscritos-${eventSlug || eventId}.csv`, [header, ...rows]);
    }
  }

  const isEmpty = tab === "participantes" ? participants.length === 0 : registrations.length === 0;

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="export-modal-title"
      style={{ position: "fixed", inset: 0, background: "hsl(var(--background) / .75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}
    >
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 14, padding: 24, maxWidth: 680, width: "calc(100% - 32px)", display: "flex", flexDirection: "column", gap: 16, maxHeight: "80dvh" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <p id="export-modal-title" style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 16, margin: 0 }}>Exportar dados</p>
          <button onClick={onClose} style={{ ...ghostSmallStyle, padding: "0 10px", fontSize: 16 }} aria-label="Fechar">✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid hsl(var(--border))", flexShrink: 0 }}>
          {(["participantes", "inscritos"] as const).map((t) => {
            const count = t === "participantes" ? participants.length : registrations.length;
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "8px 16px", marginBottom: -1,
                  border: "1px solid",
                  borderColor: isActive ? "hsl(var(--border))" : "transparent",
                  borderBottom: isActive ? "1px solid hsl(var(--card))" : "1px solid transparent",
                  borderRadius: "8px 8px 0 0",
                  background: isActive ? "hsl(var(--card))" : "transparent",
                  cursor: "pointer", fontSize: 13, fontWeight: isActive ? 600 : 400,
                  color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                }}
              >
                {t === "participantes" ? "Participantes" : "Inscritos"}
                {!loading && (
                  <span style={{ marginLeft: 6, fontSize: 11, padding: "1px 6px", borderRadius: 10, background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto", border: "1px solid hsl(var(--border))", borderRadius: 8, minHeight: 0 }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>Carregando…</div>
          ) : tab === "participantes" ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "hsl(var(--muted))", borderBottom: "1px solid hsl(var(--border))" }}>
                  {["Nome", "WhatsApp", "E-mail", "Pergunta", "Anônimo?", "LGPD"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "24px 12px", textAlign: "center", color: "hsl(var(--muted-foreground))" }}>Nenhum participante identificado.</td></tr>
                ) : participants.map((p, i) => (
                  <tr key={i} style={{ borderTop: i === 0 ? undefined : "1px solid hsl(var(--border) / .5)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500, whiteSpace: "nowrap" }}>{p.name}</td>
                    <td style={{ padding: "8px 12px", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>{p.whatsapp ?? "—"}</td>
                    <td style={{ padding: "8px 12px", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>{p.email ?? "—"}</td>
                    <td style={{ padding: "8px 12px", color: "hsl(var(--muted-foreground))", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.questionText}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", whiteSpace: "nowrap", color: p.isAnonymous ? "hsl(var(--muted-foreground))" : "hsl(142 71% 45%)" }}>{p.isAnonymous ? "Sim" : "Não"}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", whiteSpace: "nowrap", color: p.lgpdAccepted ? "hsl(142 71% 45%)" : "hsl(var(--destructive))" }}>{p.lgpdAccepted ? "Sim" : "Não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "hsl(var(--muted))", borderBottom: "1px solid hsl(var(--border))" }}>
                  {["Nome", "E-mail", "Telefone", "Presença"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrations.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: "24px 12px", textAlign: "center", color: "hsl(var(--muted-foreground))" }}>Nenhum inscrito ainda.</td></tr>
                ) : registrations.map((r, i) => (
                  <tr key={i} style={{ borderTop: i === 0 ? undefined : "1px solid hsl(var(--border) / .5)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: "8px 12px", color: "hsl(var(--muted-foreground))" }}>{r.email}</td>
                    <td style={{ padding: "8px 12px", color: "hsl(var(--muted-foreground))" }}>{r.phone ?? "—"}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", color: r.checkedIn ? "hsl(142 71% 45%)" : "hsl(var(--muted-foreground))" }}>
                      {r.checkedIn ? "Sim" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={outlineBtnStyle}>Fechar</button>
          <button
            onClick={handleDownload}
            disabled={loading || isEmpty}
            style={{ ...primaryBtnStyle, opacity: loading || isEmpty ? 0.5 : 1 }}
          >
            <Download size={14} aria-hidden /> Baixar CSV
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
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
