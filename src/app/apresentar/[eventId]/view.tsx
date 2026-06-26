"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { createBrowserClient } from "@/lib/supabase";
import { VozWordmark } from "@/components/voz/wordmark";

const projectionStateSchema = z.discriminatedUnion("phase", [
  z.object({ phase: z.literal("waiting") }),
  z.object({
    phase: z.literal("showing"),
    question: z.object({
      id: z.string().min(1),
      text: z.string(),
      authorName: z.string(),
    }),
  }),
]);

type ProjectionState = z.infer<typeof projectionStateSchema>;

interface Props {
  eventId: string;
  eventName: string;
  eventSlug: string;
  accent: string;
  bg: string;
}

export function ProjectionView({ eventId, eventName, eventSlug, accent, bg }: Props) {
  const [state, setState] = useState<ProjectionState>({ phase: "waiting" });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [questionKey, setQuestionKey] = useState(0);

  useEffect(() => {
    const url = `${window.location.origin}/e/${eventSlug}`;
    import("qrcode").then((mod) => {
      mod.default.toDataURL(url, {
        width: 320,
        margin: 2,
        color: { dark: bg, light: "#FFFFFF" },
      }).then(setQrDataUrl);
    });
  }, [eventSlug, bg]);

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`event:${eventId}:apresentar`)
      .on("broadcast", { event: "state" }, ({ payload }) => {
        const parsed = projectionStateSchema.safeParse(payload);
        if (!parsed.success) return;
        if (parsed.data.phase === "showing") setQuestionKey((k) => k + 1);
        setState(parsed.data);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  if (state.phase === "waiting") {
    return (
      <div style={{ width: "100vw", height: "100dvh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, textAlign: "center" }}>
          {/* Event name */}
          <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: `${accent}99`, margin: 0 }}>
            {eventName}
          </p>

          {/* QR Code */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 20, boxShadow: `0 0 0 6px ${accent}33`, position: "relative", display: "inline-flex" }}>
            {qrDataUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR Code" width={280} height={280} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ background: "#fff", padding: "7px 11px", borderRadius: 8, border: `3px solid ${accent}` }}>
                    <VozWordmark size={20} />
                  </div>
                </div>
              </>
            ) : (
              <div style={{ width: 280, height: 280, borderRadius: 12, background: "#f5f5f5" }} />
            )}
          </div>

          {/* CTA */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <p style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              Faça sua<br />
              <span style={{ color: accent }}>pergunta.</span>
            </p>
          </div>
        </div>

        {/* Bottom branding */}
        <div style={{ position: "fixed", bottom: 28, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', letterSpacing: "0.1em", color: `${accent}66`, textTransform: "uppercase" }}>powered by</span>
          <VozWordmark size={14} inverse />
        </div>
      </div>
    );
  }

  const { question } = state;

  return (
    <div
      key={questionKey}
      style={{
        width: "100vw", height: "100dvh", background: bg,
        display: "flex", flexDirection: "column",
        overflow: "hidden", animation: "fade-in 350ms cubic-bezier(.2,.7,.3,1)",
      }}
    >
      {/* Top bar */}
      <div style={{ padding: "28px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: `${accent}88`, margin: 0 }}>
          {eventName}
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent, boxShadow: `0 0 0 3px ${accent}44` }} />
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: `${accent}99`, letterSpacing: "0.08em", textTransform: "uppercase" }}>ao vivo</span>
        </div>
      </div>

      {/* Question */}
      <div
        style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 80px" }}
        aria-live="polite"
        aria-atomic="true"
      >
        <div style={{ display: "flex", gap: 28, alignItems: "flex-start", maxWidth: "100%" }}>
          <span
            aria-hidden
            style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: "clamp(120px, 18vw, 200px)", color: accent, lineHeight: 0.7, marginTop: -16, opacity: 0.8, flexShrink: 0, userSelect: "none" }}
          >
            &ldquo;
          </span>
          <div style={{ maxWidth: 980 }}>
            <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: "clamp(30px, 4vw, 52px)", lineHeight: 1.2, color: "#fff", letterSpacing: "-0.01em", margin: "0 0 32px" }}>
              {question.text}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 32, height: 2, background: accent, flexShrink: 0, borderRadius: 1 }} aria-hidden />
              <span style={{ fontFamily: '"Archivo", sans-serif', fontSize: "clamp(16px, 2vw, 22px)", fontWeight: 500, color: accent }}>
                {question.authorName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom branding */}
      <div style={{ padding: "0 48px 28px", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
        <VozWordmark size={14} inverse />
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
