"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Mic, QrCode, ArrowLeft, ArrowRight, Check, EyeOff, RotateCcw, Trash2 } from "lucide-react";
import { VozLockup } from "@/components/voz/wordmark";
import { StatusBadge } from "@/components/voz/status-badge";
import { createBrowserClient } from "@/lib/supabase";
import { signOut } from "next-auth/react";
import type { Question, QuestionStatus } from "@/lib/types";
import { QRModal } from "./qr-modal";
import { toast } from "sonner";

type Tab = "unread" | "all" | "hidden";

interface Assignment {
  eventId: string;
  event: { id: string; slug: string; name: string };
  assignedAt: string;
}

interface AssignmentsResponse {
  events?: { id: string; slug: string; name: string }[];
  assignments?: Assignment[];
}

export function MediatorDashboard() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("unread");
  const [selectedId, setSelectedId] = useState<string>("");
  const [qrOpen, setQrOpen] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string>("");
  const [eventSlug, setEventSlug] = useState<string>("");
  const [noEvent, setNoEvent] = useState(false);

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
          const nextQ = data.questions.find((q) => q.status === "next");
          setSelectedId(nextQ?.id ?? data.questions[0]?.id ?? "");
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

  const counts = {
    unread: questions.filter((q) => q.status === "pending" || q.status === "next").length,
    all: questions.filter((q) => q.status !== "hidden").length,
    hidden: questions.filter((q) => q.status === "hidden").length,
  };

  const newBadge = useMemo(() => {
    const cutoff = new Date(Date.now() - 5 * 60000);
    return questions.filter(
      (q) => q.status === "pending" && new Date(q.createdAt) > cutoff
    ).length;
  }, [questions]);

  const listed =
    tab === "unread" ? questions.filter((q) => q.status === "pending" || q.status === "next")
    : tab === "all" ? questions.filter((q) => q.status !== "hidden")
    : questions.filter((q) => q.status === "hidden");

  const answeredSection = tab === "unread" ? questions.filter((q) => q.status === "answered") : [];
  const selected = questions.find((q) => q.id === selectedId) ?? listed[0] ?? null;

  const deleteQuestion = useCallback(async (id: string) => {
    if (!window.confirm("Apagar esta pergunta permanentemente? Não pode ser desfeito.")) return;
    setQuestions((qs) => qs.filter((q) => q.id !== id));
    try {
      const res = await fetch(`/api/v1/questions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha");
    } catch {
      toast.error("Erro ao apagar. Atualize a página.");
    }
  }, []);

  const applyAction = useCallback(async (id: string, action: "setNext" | "markAnswered" | "hide" | "restore") => {
    const patchMap: Record<string, Partial<Question>> = {
      setNext: { status: "next" as QuestionStatus },
      markAnswered: { status: "answered" as QuestionStatus, answeredAt: new Date().toISOString() },
      hide: { status: "hidden" as QuestionStatus, hiddenAt: new Date().toISOString() },
      restore: { status: "pending" as QuestionStatus },
    };
    if (action === "setNext") {
      setQuestions((qs) => qs.map((q) => ({ ...q, status: q.id === id ? "next" as QuestionStatus : q.status === "next" ? "pending" as QuestionStatus : q.status })));
    } else {
      setQuestions((qs) => qs.map((q) => q.id === id ? { ...q, ...patchMap[action] } : q));
    }
    try {
      await fetch(`/api/v1/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch {
      toast.error("Erro ao salvar. Atualize a página.");
    }
  }, []);

  const navigate = useCallback((dir: 1 | -1) => {
    const i = listed.findIndex((q) => q.id === selectedId);
    const next = listed[(i + dir + listed.length) % listed.length];
    if (next) setSelectedId(next.id);
  }, [listed, selectedId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); navigate(1); }
      if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); navigate(-1); }
      if (e.key === "r" && selected) { e.preventDefault(); applyAction(selected.id, "markAnswered"); }
      if (e.key === "n" && selected) { e.preventDefault(); applyAction(selected.id, "setNext"); }
      if (e.key === "p" && eventId) { e.preventDefault(); router.push(`/mediador/apresentar?eventId=${eventId}`); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [navigate, selected, applyAction, router, eventId]);

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
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 20px", gap: 16, flexShrink: 0 }}>
        <VozLockup eventName={eventName} size={18} />
        <div style={{ width: 1, height: 24, background: "hsl(var(--border))" }} aria-hidden />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "hsl(var(--success))", boxShadow: "0 0 0 4px hsl(var(--success) / .2)" }} aria-hidden />
          ao vivo
        </div>
        <div style={{ flex: 1 }} />
        <div aria-live="polite" aria-atomic="true">
          {newBadge > 0 && (
            <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: "hsl(var(--accent) / .15)", color: "hsl(38 85% 32%)", fontSize: 13, fontWeight: 600, animation: "pulse 2s infinite" }}>
              {newBadge} nova{newBadge > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button onClick={() => setQrOpen(true)} style={outlineBtnStyle}>
          <QrCode size={14} aria-hidden /> QR do evento
        </button>
        <button onClick={() => eventId && router.push(`/mediador/apresentar?eventId=${eventId}`)} style={primaryBtnStyle}>
          <Mic size={14} aria-hidden /> Modo apresentação
        </button>
      </header>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "440px 1fr", overflow: "hidden" }}>
        <nav aria-label="Lista de perguntas" style={{ borderRight: "1px solid hsl(var(--border))", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid hsl(var(--border))", display: "flex", gap: 4 }} role="tablist">
            {([["unread", "Não lidas", counts.unread], ["all", "Todas", counts.all], ["hidden", "Ocultas", counts.hidden]] as const).map(([t, label, count]) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: tab === t ? "hsl(var(--muted))" : "transparent", color: tab === t ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
                {label} <span style={{ fontSize: 12 }}>{count}</span>
              </button>
            ))}
          </div>

          <div role="tabpanel" style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {!loading && listed.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>
                <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 16, color: "hsl(var(--foreground))", marginBottom: 6 }}>Sem perguntas aqui</p>
                <p style={{ fontSize: 13, margin: 0 }}>Compartilhe o QR Code com a plateia.</p>
              </div>
            )}
            {listed.map((q) => <QuestionCard key={q.id} q={q} selected={q.id === selected?.id} onClick={() => setSelectedId(q.id)} />)}
            {answeredSection.length > 0 && (
              <>
                <p style={{ padding: "12px 8px 4px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", margin: 0 }}>respondidas · hoje</p>
                {answeredSection.map((q) => <QuestionCard key={q.id} q={q} selected={q.id === selected?.id} onClick={() => setSelectedId(q.id)} />)}
              </>
            )}
          </div>
        </nav>

        <main>
          {selected ? (
            <QuestionDetail
              q={selected}
              onPrev={() => navigate(-1)}
              onNext={() => navigate(1)}
              onMarkAnswered={() => applyAction(selected.id, "markAnswered")}
              onHide={() => applyAction(selected.id, "hide")}
              onRestore={() => applyAction(selected.id, "restore")}
              onDelete={() => deleteQuestion(selected.id)}
              onPresent={() => { applyAction(selected.id, "setNext"); if (eventId) router.push(`/mediador/apresentar?eventId=${eventId}`); }}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "hsl(var(--muted-foreground))" }}>
              Selecione uma pergunta à esquerda.
            </div>
          )}
        </main>
      </div>

      <footer style={{ height: 34, borderTop: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 20px", gap: 16, fontSize: 12, color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
        <span>Atalhos: <kbd style={kbd}>J</kbd>/<kbd style={kbd}>K</kbd> navegar · <kbd style={kbd}>R</kbd> respondida · <kbd style={kbd}>N</kbd> próxima · <kbd style={kbd}>P</kbd> apresentar</span>
      </footer>

      {qrOpen && <QRModal slug={eventSlug} onClose={() => setQrOpen(false)} />}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
    </div>
  );
}

function QuestionCard({ q, selected, onClick }: { q: Question; selected: boolean; onClick: () => void }) {
  const initials = q.authorName === "Anônimo" ? "?" : q.authorName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const when = formatRelative(q.createdAt);
  return (
    <article onClick={onClick} aria-current={selected ? "true" : undefined} style={{ padding: 14, borderRadius: 10, cursor: "pointer", background: selected ? "hsl(var(--primary) / .06)" : "transparent", border: "1px solid", borderColor: selected ? "hsl(var(--primary) / .35)" : "transparent", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{q.authorName}</span>
        <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginLeft: "auto" }}>{when}</span>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.45, margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", color: q.status === "answered" || q.status === "hidden" ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))" }}>
        {q.text}
      </p>
      {(q.status === "next" || q.status === "answered" || q.status === "hidden") && <StatusBadge status={q.status} />}
    </article>
  );
}

function QuestionDetail({ q, onPrev, onNext, onMarkAnswered, onHide, onRestore, onDelete, onPresent }: {
  q: Question; onPrev: () => void; onNext: () => void;
  onMarkAnswered: () => void; onHide: () => void; onRestore: () => void;
  onDelete: () => void; onPresent: () => void;
}) {
  const initials = q.authorName === "Anônimo" ? "?" : q.authorName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>{initials}</div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{q.authorName}</p>
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0 }}>{q.authorContact || "sem contato"} · {formatRelative(q.createdAt)}</p>
          </div>
        </div>
        <StatusBadge status={q.status} />
      </div>

      <div style={{ flex: 1, padding: "28px 28px 0", overflowY: "auto" }}>
        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", marginBottom: 10 }}>PERGUNTA</p>
        <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 500, fontSize: 28, lineHeight: 1.3, letterSpacing: "-0.005em", maxWidth: 720, margin: "0 0 28px" } as React.CSSProperties}>
          {q.text}
        </p>
        <div style={{ padding: 16, background: "hsl(var(--muted))", borderRadius: 12, maxWidth: 720, display: "flex", gap: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.75" strokeLinecap="round" style={{ flexShrink: 0 }} aria-hidden><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
          <p style={{ fontSize: 13, margin: 0 }}>Use <strong>&quot;Levar ao palco&quot;</strong> para marcar como próxima. O Modo apresentação projeta automaticamente.</p>
        </div>
      </div>

      <div style={{ padding: "16px 28px 20px", borderTop: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
        <button onClick={onDelete} style={deleteBtnStyle} aria-label="Apagar pergunta permanentemente"><Trash2 size={14} aria-hidden /></button>
        <div style={{ width: 1, height: 24, background: "hsl(var(--border))", flexShrink: 0 }} aria-hidden />
        <button onClick={onPrev} style={outlineBtnStyle} aria-label="Pergunta anterior"><ArrowLeft size={14} aria-hidden /> Anterior</button>
        <button onClick={onNext} style={outlineBtnStyle} aria-label="Próxima pergunta">Próxima <ArrowRight size={14} aria-hidden /></button>
        <div style={{ flex: 1 }} />
        {q.status === "hidden"
          ? <button onClick={onRestore} style={ghostBtnStyle}><RotateCcw size={14} aria-hidden /> Restaurar</button>
          : <button onClick={onHide} style={ghostBtnStyle}><EyeOff size={14} aria-hidden /> Ocultar</button>}
        {q.status !== "answered" && q.status !== "hidden" && (
          <button onClick={onMarkAnswered} style={secondaryBtnStyle}><Check size={14} aria-hidden /> Respondida</button>
        )}
        {q.status !== "next" && q.status !== "answered" && q.status !== "hidden" && (
          <button onClick={onPresent} style={primaryBtnStyle}><Mic size={14} aria-hidden /> Levar ao palco</button>
        )}
        {q.status === "next" && (
          <button onClick={onPresent} style={primaryBtnStyle}><Mic size={14} aria-hidden /> Abrir apresentação</button>
        )}
      </div>
    </div>
  );
}

function formatRelative(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "agora";
  if (diff === 1) return "há 1 min";
  if (diff < 60) return `há ${diff} min`;
  return `há ${Math.floor(diff / 60)}h`;
}

const primaryBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" };
const secondaryBtnStyle: React.CSSProperties = { ...primaryBtnStyle, background: "hsl(var(--muted))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" };
const outlineBtnStyle: React.CSSProperties = { ...primaryBtnStyle, background: "transparent", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" };
const ghostBtnStyle: React.CSSProperties = { ...primaryBtnStyle, background: "transparent", color: "hsl(var(--muted-foreground))", border: "none" };
const deleteBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: "1px solid hsl(var(--destructive) / .3)", cursor: "pointer", background: "transparent", color: "hsl(var(--destructive))", flexShrink: 0 };
