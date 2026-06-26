"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ExternalLink, QrCode, Download } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";
import { HeaderControls } from "@/components/voz/header-controls";
import { createBrowserClient } from "@/lib/supabase";
import { signOut, useSession } from "next-auth/react";
import type { Question, QuestionStatus } from "@/lib/types";
import { questionBroadcastSchema, questionDeletedBroadcastSchema, type QuestionBroadcast } from "@/lib/schemas";
import { QRModal } from "./qr-modal";
import { toast } from "sonner";
import { MedTab } from "./_dashboard/med-tab";
import { QuestionSlot } from "./_dashboard/question-slot";
import { ExportModal } from "./_dashboard/export-modal";
import { DeleteModal } from "./_dashboard/delete-modal";
import { subnavBtnStyle } from "./_dashboard/styles";

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
