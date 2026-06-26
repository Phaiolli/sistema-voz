"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { VozLockup } from "@/components/voz/wordmark";
import { createBrowserClient } from "@/lib/supabase";
import type { Question } from "@/lib/types";
import { questionBroadcastSchema } from "@/lib/schemas";

export function PresentationMode() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";

  const [queue, setQueue] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/v1/events/${eventId}/questions`)
      .then((r) => r.json())
      .then((data: { questions?: Question[] }) => {
        const filtered = (data.questions ?? []).filter(
          (q) => q.status === "next" || q.status === "pending"
        );
        setQueue(filtered);
        const nextIdx = filtered.findIndex((q) => q.status === "next");
        setIdx(Math.max(0, nextIdx));
      })
      .catch(() => {});
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`event:${eventId}:questions`)
      .on("broadcast", { event: "question:updated" }, ({ payload }) => {
        const parsed = questionBroadcastSchema.safeParse(payload);
        if (!parsed.success) return;
        const incoming = parsed.data;
        setQueue((prev) => {
          if (incoming.status === "next" || incoming.status === "pending") {
            const existing = prev.find((q) => q.id === incoming.id);
            const updated: Question = existing
              ? { ...existing, ...incoming }
              : { ...incoming, lgpdAccepted: true };
            if (existing) return prev.map((q) => (q.id === incoming.id ? updated : q));
            return [...prev, updated];
          }
          return prev.filter((q) => q.id !== incoming.id);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const activeQueue = queue.filter((q) => !answered.has(q.id));
  const total = activeQueue.length;
  const current = activeQueue[Math.min(idx, activeQueue.length - 1)] ?? null;

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  useEffect(() => {
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  const go = useCallback((d: 1 | -1) => {
    setIdx((i) => Math.max(0, Math.min(activeQueue.length - 1, i + d)));
    showControls();
  }, [activeQueue.length, showControls]);

  const markAnswered = useCallback(() => {
    if (!current) return;
    fetch(`/api/v1/questions/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAnswered" }),
    }).catch(() => {});
    setAnswered((s) => new Set([...s, current.id]));
    setIdx((i) => Math.min(activeQueue.length - 2, i));
    showControls();
  }, [current, activeQueue.length, showControls]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(1); }
      if (e.key === "r" || e.key === "R") { e.preventDefault(); markAnswered(); }
      if (e.key === "Escape") { e.preventDefault(); router.push("/mediador"); }
      showControls();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [go, markAnswered, router, showControls]);

  const kbd: React.CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace', fontSize: 11, padding: "1px 5px",
    border: "1px solid hsl(var(--border))", borderRadius: 4,
    color: "rgba(255,255,255,.7)", background: "rgba(255,255,255,.1)",
  };

  if (!eventId) {
    return (
      <div className="theme-incluir" style={{ width: "100vw", height: "100dvh", background: "hsl(var(--background))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
        <p style={{ fontSize: 18, color: "hsl(var(--muted-foreground))" }}>ID do evento não encontrado. Volte ao painel.</p>
        <button onClick={() => router.push("/mediador")} style={{ height: 44, padding: "0 20px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 15 }}>
          Voltar ao painel
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="theme-incluir" style={{ width: "100vw", height: "100dvh", background: "hsl(var(--background))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
        <h1 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 64, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>
          Fila vazia<span style={{ color: "hsl(var(--accent))" }}>.</span>
        </h1>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 18 }}>Aguardando a próxima pergunta.</p>
        <button onClick={() => router.push("/mediador")} style={{ marginTop: 20, height: 44, padding: "0 20px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 15 }}>
          Voltar ao painel
        </button>
      </div>
    );
  }

  return (
    <div
      onMouseMove={showControls}
      onTouchStart={showControls}
      className="theme-incluir"
      style={{ width: "100vw", height: "100dvh", background: "hsl(var(--background))", color: "#fff", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <div style={{ padding: "32px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <VozLockup eventName="" size={20} inverse />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: "hsl(var(--muted-foreground))", letterSpacing: "0.1em" }}>PERGUNTA</span>
          <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 22, color: "hsl(var(--accent))", letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>
            {String(idx + 1).padStart(2, "0")}
          </span>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
            / {String(total).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div
        key={current.id}
        style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 80px", animation: "fade-up 280ms cubic-bezier(.2,.7,.3,1)" }}
        aria-live="polite"
        aria-atomic="true"
      >
        <div style={{ display: "flex", gap: 32, alignItems: "flex-start", maxWidth: "100%" }}>
          <span
            aria-hidden
            style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 200, color: "hsl(var(--accent))", lineHeight: 0.7, marginTop: -20, opacity: 0.9, flexShrink: 0, userSelect: "none" }}
          >
            &ldquo;
          </span>
          <div style={{ maxWidth: 980 }}>
            <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: "clamp(36px, 4.5vw, 56px)", lineHeight: 1.15, color: "#fff", letterSpacing: "-0.01em", margin: "0 0 36px" }}>
              {current.text}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 32, height: 1, background: "hsl(var(--accent))", flexShrink: 0 }} aria-hidden />
              <span style={{ fontFamily: '"Archivo", sans-serif', fontSize: 22, fontWeight: 500, color: "hsl(var(--accent))" }}>
                {current.authorName}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{ position: "absolute", right: 32, bottom: 32, display: "flex", gap: 12, opacity: controlsVisible ? 1 : 0.12, transition: "opacity .25s" }}
        aria-hidden={!controlsVisible}
      >
        <PresentBtn onClick={() => go(-1)} aria-label="Pergunta anterior"><ArrowLeft size={24} /></PresentBtn>
        <PresentBtn onClick={markAnswered} aria-label="Marcar como respondida"><Check size={24} /></PresentBtn>
        <PresentBtn primary onClick={() => go(1)} aria-label="Próxima pergunta"><ArrowRight size={24} /></PresentBtn>
        <PresentBtn onClick={() => router.push("/mediador")} aria-label="Sair do modo apresentação"><X size={24} /></PresentBtn>
      </div>

      <div
        style={{ position: "absolute", left: 48, bottom: 36, display: "flex", gap: 16, fontSize: 12, color: "rgba(255,255,255,.6)", opacity: controlsVisible ? 1 : 0.12, transition: "opacity .25s" }}
        aria-hidden="true"
      >
        <span><kbd style={kbd}>←</kbd> <kbd style={kbd}>→</kbd> navegar</span>
        <span><kbd style={kbd}>R</kbd> respondida</span>
        <span><kbd style={kbd}>Esc</kbd> sair</span>
      </div>

      <style>{`
        @keyframes fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
      `}</style>
    </div>
  );
}

function PresentBtn({ children, primary, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      {...props}
      style={{
        width: 64, height: 64, borderRadius: "50%", border: "1px solid",
        borderColor: primary ? "hsl(var(--accent))" : "hsl(var(--border))",
        background: primary ? "hsl(var(--accent))" : "hsl(var(--muted))",
        color: primary ? "hsl(var(--accent-foreground))" : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", boxShadow: primary ? "0 8px 24px hsl(var(--accent) / .35)" : "none",
        transition: "transform .12s",
      }}
    >
      {children}
    </button>
  );
}
