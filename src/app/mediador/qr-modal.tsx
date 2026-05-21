"use client";

import { useState, useEffect } from "react";
import { X, Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { generateQrWithLogo } from "@/lib/qr";

export function QRModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const url = typeof window !== "undefined" ? `${window.location.origin}/e/${slug}` : `/e/${slug}`;

  useEffect(() => {
    if (!slug) return;
    generateQrWithLogo(url, 320).then(setQrDataUrl);
  }, [slug, url]);

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qrcode-${slug || "evento"}.png`;
    a.click();
  }

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => toast.success("Link copiado."));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-title"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "hsl(var(--background))", borderRadius: 16, padding: 32, maxWidth: 480, width: "calc(100% - 40px)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 id="qr-title" style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: 0 }}>QR Code do evento</h2>
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: "4px 0 0" }}>Compartilhe com a plateia para receber perguntas.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", cursor: "pointer" }}>
            <X size={16} aria-hidden />
          </button>
        </div>

        <div style={{ background: "#fff", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 16, position: "relative", textAlign: "center", minHeight: 352, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {qrDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={qrDataUrl} alt="QR Code do evento" width={320} height={320} />
          ) : (
            <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>Gerando QR…</div>
          )}
        </div>

        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: "hsl(var(--muted-foreground))", textAlign: "center", margin: "12px 0 0", wordBreak: "break-all" }}>
          {url}
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            onClick={downloadQr}
            disabled={!qrDataUrl}
            style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", cursor: qrDataUrl ? "pointer" : "not-allowed", fontSize: 13, opacity: qrDataUrl ? 1 : 0.5 }}
          >
            <Download size={14} aria-hidden /> PNG
          </button>
          <button
            onClick={copyLink}
            style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, borderRadius: 8, border: "none", background: "hsl(var(--muted))", cursor: "pointer", fontSize: 13 }}
          >
            <Copy size={14} aria-hidden /> Link
          </button>
        </div>
      </div>
    </div>
  );
}
