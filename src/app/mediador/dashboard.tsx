"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ExternalLink, QrCode, ArrowLeft, ArrowRight, Check, EyeOff, RotateCcw, Trash2, MonitorPlay, MonitorOff } from "lucide-react";
import { VozLockup } from "@/components/voz/wordmark";
import { StatusBadge } from "@/components/voz/status-badge";
import { HeaderControls } from "@/components/voz/header-controls";
import { createBrowserClient } from "@/lib/supabase";
import { signOut } from "next-auth/react";
import type { Question, QuestionStatus } from "@/lib/types";
import { QRModal } from "./qr-modal";
import { toast } from "sonner";

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

export function MediatorDashboard() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("unread");
  const [selectedId, setSelectedId] = useState<string>("");
  const [projectedId, setProjectedId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
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
        setQuestions((qs) => [payload as Question, ...qs]);
        toast("Nova pergunta recebida.");
      })
      .on("broadcast", { event: "question:updated" }, ({ payload }) => {
        setQuestions((qs) => qs.map((q) => q.id === (payload as Question).id ? (payload as Question) : q));
      })
      .on("broadcast", { event: "question:deleted" }, ({ payload }) => {
        setQuestions((qs) => qs.filter((q) => q.id !== (payload as { id: string }).id));
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
      payload: { phase: "showing", question: { id: q.id, text: q.text, authorName: q.authorName } },
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
    if (!window.confirm("Apagar esta pergunta permanentemente? Não pode ser desfeito.")) return;
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
      if (e.key === "r" && currentQ) { e.preventDefault(); applyAction(currentQ.id, "markAnswered"); }
      if (e.key === "p" && currentQ) {
        e.preventDefault();
        if (projectedId === currentQ.id) unprojectQuestion();
        else projectQuestion(currentQ);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [goNext, goPrev, currentQ, applyAction, projectedId, projectQuestion, unprojectQuestion]);

  const kbd: React.CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
    padding: "1px 5px", border: "1px solid hsl(var(--border))",
    borderRadius: 4, background: "hsl(var(--muted))",
  };

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

      {/* Header */}
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0, minWidth: 0, overflow: "hidden" }}>
        <VozLockup eventName={eventName} size={18} />
        <div style={{ flex: 1 }} />
        {newBadge > 0 && (
          <span aria-live="polite" aria-atomic="true" style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: "hsl(var(--accent) / .15)", color: "hsl(38 85% 32%)", fontSize: 13, fontWeight: 600, animation: "pulse 2s infinite", flexShrink: 0 }}>
            {newBadge} nova{newBadge > 1 ? "s" : ""}
          </span>
        )}
        <div style={{ width: 1, height: 24, background: "hsl(var(--border))", flexShrink: 0 }} aria-hidden />
        <HeaderControls />
      </header>

      {/* Toolbar: links + tab filter */}
      <div style={{ borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "6px 12px", gap: 8, flexShrink: 0, overflowX: "auto", scrollbarWidth: "none" }}>
        <button onClick={() => setQrOpen(true)} style={toolBtnStyle} aria-label="QR Code do evento">
          <QrCode size={16} aria-hidden />
          <span>QR Code</span>
        </button>
        <button onClick={() => eventId && window.open(`/apresentar/${eventId}`, "_blank")} style={toolBtnStyle} aria-label="Abrir link para projeção">
          <ExternalLink size={16} aria-hidden />
          <span>Link para Projeção</span>
        </button>
        <div style={{ flex: 1 }} />
        {/* Question summary */}
        <div style={{ display: "flex", gap: 10, fontSize: 12, color: "hsl(var(--muted-foreground))", flexShrink: 0, alignItems: "center", padding: "0 4px" }} aria-live="polite" aria-atomic="true">
          <span><strong style={{ color: "hsl(var(--foreground))", fontVariantNumeric: "tabular-nums" }}>{questions.length}</strong> perguntas</span>
          {counts.pending > 0 && <span style={{ color: "hsl(var(--muted-foreground))" }}>·&nbsp;<strong style={{ color: "hsl(var(--foreground))", fontVariantNumeric: "tabular-nums" }}>{counts.pending}</strong> pendentes</span>}
          {counts.answered > 0 && <span style={{ color: "hsl(var(--muted-foreground))" }}>·&nbsp;<strong style={{ color: "hsl(142 71% 55%)", fontVariantNumeric: "tabular-nums" }}>{counts.answered}</strong> respondidas</span>}
        </div>
        <div style={{ width: 1, height: 20, background: "hsl(var(--border))", flexShrink: 0 }} aria-hidden />
        <button
          onClick={() => setTab(tab === "hidden" ? "unread" : "hidden")}
          aria-pressed={tab === "hidden"}
          style={{
            padding: "6px 12px", borderRadius: 8, border: "1px solid",
            cursor: "pointer", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0,
            borderColor: tab === "hidden" ? "hsl(var(--border))" : "hsl(var(--border) / .4)",
            background: tab === "hidden" ? "hsl(var(--muted))" : "transparent",
            color: tab === "hidden" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
          }}
        >
          Ocultas <span style={{ fontSize: 12 }}>{counts.hidden}</span>
        </button>
      </div>

      {/* Main: single column — up to 2 prev + current + up to 3 next */}
      <main style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6, maxWidth: 800, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
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
            onMarkAnswered={() => applyAction(currentQ.id, "markAnswered")}
            onDelete={() => deleteQuestion(currentQ.id)}
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

      {/* Footer */}
      <footer style={{ height: 34, borderTop: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 20px", gap: 16, fontSize: 12, color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
        <span>Atalhos: <kbd style={kbd}>J</kbd>/<kbd style={kbd}>K</kbd> navegar · <kbd style={kbd}>P</kbd> projetar · <kbd style={kbd}>R</kbd> respondida</span>
        {currentQ && <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{currentIdx + 1} / {listed.length}</span>}
      </footer>

      {qrOpen && <QRModal slug={eventSlug} eventName={eventName} theme={eventTheme} onClose={() => setQrOpen(false)} />}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
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
  onMarkAnswered?: () => void;
  onDelete?: () => void;
}

function QuestionSlot({ q, role, projectedId, onClick, onPrev, onNext, onProject, onUnproject, onHide, onRestore, onMarkAnswered, onDelete }: QuestionSlotProps) {
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
        overflow: "hidden",
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
        {isCurrent && <StatusBadge status={q.status} />}
        <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginLeft: "auto", flexShrink: 0 }}>{formatRelative(q.createdAt)}</span>
        {isCurrent && (
          q.status === "hidden"
            ? <button onClick={onRestore} style={ghostSmallStyle} aria-label="Restaurar pergunta">
                <RotateCcw size={13} aria-hidden /> Restaurar
              </button>
            : <button onClick={onHide} style={ghostSmallStyle} aria-label="Ocultar pergunta">
                <EyeOff size={13} aria-hidden /> Ocultar
              </button>
        )}
      </div>

      {/* Question text */}
      <div style={{ padding: isCurrent ? "10px 16px" : "4px 12px 10px" }}>
        <p style={{
          fontFamily: '"Archivo", sans-serif',
          fontWeight: isCurrent ? 500 : 400,
          fontSize: isCurrent ? 22 : 13,
          lineHeight: 1.35,
          margin: 0,
          color: q.status === "answered" || q.status === "hidden" ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
          ...(!isCurrent ? clampStyle : {}),
        }}>
          {q.text}
        </p>
      </div>

      {/* Action bar — current only */}
      {isCurrent && (
        <div style={{ padding: "10px 16px 14px", borderTop: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onDelete} style={deleteBtnStyle} aria-label="Apagar pergunta permanentemente">
            <Trash2 size={14} aria-hidden />
          </button>
          <div style={{ width: 1, height: 20, background: "hsl(var(--border))", flexShrink: 0 }} aria-hidden />
          <button
            onClick={onPrev}
            disabled={!onPrev}
            style={{ ...outlineBtnStyle, opacity: onPrev ? 1 : 0.35 }}
            aria-label="Pergunta anterior"
          >
            <ArrowLeft size={14} aria-hidden /> Anterior
          </button>
          {q.status !== "hidden" && (
            isProjected
              ? <button onClick={onUnproject} style={projectedBtnStyle} aria-label="Retirar do projetor">
                  <MonitorOff size={14} aria-hidden /> Retirar do Projetor
                </button>
              : <button onClick={onProject} style={primaryBtnStyle} aria-label="Projetar esta pergunta">
                  <MonitorPlay size={14} aria-hidden /> Projetar
                </button>
          )}
          <button
            onClick={onNext}
            disabled={!onNext}
            style={{ ...outlineBtnStyle, opacity: onNext ? 1 : 0.35 }}
            aria-label="Próxima pergunta"
          >
            Próxima <ArrowRight size={14} aria-hidden />
          </button>
          <div style={{ flex: 1 }} />
          {q.status !== "hidden" && (
            q.status === "answered"
              ? <button onClick={onRestore} style={{ ...secondaryBtnStyle, color: "hsl(var(--muted-foreground))" }} aria-label="Desmarcar respondida">
                  <RotateCcw size={14} aria-hidden /> Desmarcar
                </button>
              : <button onClick={onMarkAnswered} style={secondaryBtnStyle} aria-label="Marcar como respondida">
                  <Check size={14} aria-hidden /> Respondida
                </button>
          )}
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

const primaryBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", flexShrink: 0 };
const projectedBtnStyle: React.CSSProperties = { ...primaryBtnStyle, background: "hsl(var(--primary) / .12)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / .35)" };
const secondaryBtnStyle: React.CSSProperties = { ...primaryBtnStyle, background: "hsl(var(--muted))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" };
const outlineBtnStyle: React.CSSProperties = { ...primaryBtnStyle, background: "transparent", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" };
const ghostSmallStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, height: 28, padding: "0 8px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, background: "transparent", color: "hsl(var(--muted-foreground))", flexShrink: 0 };
const deleteBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: "1px solid hsl(var(--destructive) / .3)", cursor: "pointer", background: "transparent", color: "hsl(var(--destructive))", flexShrink: 0 };
const toolBtnStyle: React.CSSProperties = { display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "5px 14px", borderRadius: 8, border: "1px solid hsl(var(--border))", cursor: "pointer", fontSize: 11, fontWeight: 500, background: "transparent", color: "hsl(var(--foreground))", minWidth: 64, flexShrink: 0 };
