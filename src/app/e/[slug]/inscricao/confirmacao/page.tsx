"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { VozWordmark } from "@/components/voz/wordmark";
import { Download, CheckCircle2 } from "lucide-react";
import type { Registration } from "@/lib/types";

function ConfirmationContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const regId = searchParams.get("id");
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!regId) { setError(true); return; }
    // We display confirmation without re-fetching sensitive data — QR is built from the public registration ID
    setRegistration({ id: regId } as Registration);
  }, [regId]);

  useEffect(() => {
    if (!regId) return;
    import("qrcode").then((mod) => {
      const qrUrl = `${window.location.origin}/e/${params.slug}/inscricao/confirmacao?id=${regId}`;
      mod.default.toDataURL(qrUrl, {
        width: 280,
        margin: 2,
        color: { dark: "#0A0A0A", light: "#FFFFFF" },
      }).then(setQrDataUrl);
    });
  }, [regId, params.slug]);

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `credencial-${regId}.png`;
    a.click();
  }

  if (error || !regId) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>
        Link de confirmação inválido.
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px" }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ marginBottom: 28, textAlign: "left" }}>
          <VozWordmark size={22} />
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "hsl(142 71% 40%)", marginBottom: 16 }}>
          <CheckCircle2 size={22} />
          <span style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 18 }}>Inscrição confirmada!</span>
        </div>

        <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", margin: "0 0 28px" }}>
          Apresente este QR Code no credenciamento para retirar seu kit.
        </p>

        <div style={{ background: "#fff", border: "1px solid hsl(var(--border))", borderRadius: 16, padding: 28, marginBottom: 16, position: "relative", display: "inline-block" }}>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code de credenciamento" width={240} height={240} style={{ display: "block" }} />
          ) : (
            <div style={{ width: 240, height: 240, background: "hsl(var(--muted))", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
              Gerando QR…
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ background: "#fff", padding: "5px 9px", borderRadius: 7, border: "3px solid #F2B33D" }}>
              <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 14 }}>
                voz<span style={{ color: "#F2B33D" }}>.</span>
              </span>
            </div>
          </div>
        </div>

        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: "hsl(var(--muted-foreground))", marginBottom: 20, wordBreak: "break-all" }}>
          ID: {regId}
        </p>

        <button
          onClick={downloadQr}
          disabled={!qrDataUrl}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 20px", borderRadius: 10, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 14, cursor: qrDataUrl ? "pointer" : "not-allowed", opacity: qrDataUrl ? 1 : 0.5 }}
        >
          <Download size={15} aria-hidden /> Salvar QR Code
        </button>

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </div>
  );
}

export default function ConfirmacaoPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Carregando…</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
