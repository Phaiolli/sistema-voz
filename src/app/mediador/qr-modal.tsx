"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download, Printer, Share2 } from "lucide-react";
import { generateQr } from "@/lib/qr";
import { toast } from "sonner";

interface EventTheme {
  background?: string;
  accent?: string;
  logoUrl?: string;
}

interface QRModalProps {
  slug: string;
  eventName: string;
  theme?: EventTheme;
  onClose: () => void;
}

// A5 at 150 dpi: 874 × 1240px
const W = 874;
const H = 1240;

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderPosterCanvas(
  eventName: string,
  theme: EventTheme,
  qrDataUrl: string,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const bg = theme.background ?? "#1E4953";
  const accent = theme.accent ?? "#F2B33D";

  await document.fonts.ready;

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 16);

  // Bottom accent bar
  ctx.fillRect(0, H - 16, W, 16);

  let y = 60;

  // Logo or voz. wordmark
  if (theme.logoUrl) {
    try {
      const logo = await loadImage(theme.logoUrl);
      const maxLogoH = 80;
      const ratio = logo.naturalWidth / logo.naturalHeight;
      const lh = Math.min(maxLogoH, logo.naturalHeight);
      const lw = lh * ratio;
      ctx.drawImage(logo, (W - lw) / 2, y, lw, lh);
      y += lh + 36;
    } catch {
      // fall through to text wordmark
    }
  }

  if (!theme.logoUrl) {
    const fs = 40;
    ctx.font = `900 ${fs}px "Archivo Black", "Arial Black", sans-serif`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const vozW = ctx.measureText("voz").width;
    const startX = W / 2 - (vozW + ctx.measureText(".").width) / 2;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("voz", startX, y);
    ctx.fillStyle = accent;
    ctx.fillText(".", startX + vozW, y);
    y += fs + 40;
  }

  // Accent rule
  ctx.fillStyle = accent;
  ctx.fillRect((W - 64) / 2, y, 64, 5);
  y += 30;

  // Event name
  const nameSize = 92;
  ctx.font = `900 ${nameSize}px "Archivo Black", "Arial Black", sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const nameLines = wrapText(ctx, eventName.toUpperCase(), W - 100);
  for (const line of nameLines) {
    ctx.fillText(line, W / 2, y);
    y += Math.round(nameSize * 1.05);
  }
  y += 32;

  // CTA line 1
  const ctaSize = 38;
  ctx.font = `700 ${ctaSize}px "Archivo", Arial, sans-serif`;
  ctx.fillStyle = accent;
  ctx.fillText("Faça sua pergunta!", W / 2, y);
  y += Math.round(ctaSize * 1.35);

  // CTA line 2
  const subSize = 28;
  ctx.font = `400 ${subSize}px "Archivo", Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText("Escaneie o QR Code abaixo para participar.", W / 2, y);
  y += Math.round(subSize * 1.4) + 40;

  // QR code with white rounded card
  const qrImg = await loadImage(qrDataUrl);
  const qrSize = 440;
  const pad = 32;
  const boxSize = qrSize + pad * 2;
  const qrX = (W - boxSize) / 2;

  ctx.fillStyle = "#FFFFFF";
  fillRoundRect(ctx, qrX, y, boxSize, boxSize, 28);
  ctx.drawImage(qrImg, qrX + pad, y + pad, qrSize, qrSize);
  y += boxSize + 40;

  // Footer
  const ftSize = 24;
  ctx.font = `500 ${ftSize}px "Archivo", Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.fillText("powered by voz.", W / 2, y);

  return canvas;
}

export function QRModal({ slug, eventName, theme = {}, onClose }: QRModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const url = typeof window !== "undefined" ? `${window.location.origin}/e/${slug}` : `/e/${slug}`;

  useEffect(() => {
    if (!slug) return;
    generateQr(url, 480).then(setQrDataUrl);
  }, [slug, url]);

  useEffect(() => {
    if (!qrDataUrl) return;
    renderPosterCanvas(eventName, theme, qrDataUrl)
      .then((c) => setPreviewDataUrl(c.toDataURL("image/jpeg", 0.9)));
  }, [qrDataUrl, eventName, theme]);

  const getPosterCanvas = useCallback(async () => {
    if (!qrDataUrl) throw new Error("QR não carregado");
    return renderPosterCanvas(eventName, theme, qrDataUrl);
  }, [qrDataUrl, eventName, theme]);

  async function downloadPdf() {
    if (!qrDataUrl || busy) return;
    setBusy(true);
    try {
      const canvas = await getPosterCanvas();
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ format: "a5", orientation: "portrait", unit: "mm" });
      pdf.addImage(imgData, "JPEG", 0, 0, 148, 210);
      pdf.save(`poster-${slug}.pdf`);
    } catch {
      toast.error("Erro ao gerar PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function printPoster() {
    if (!qrDataUrl || busy) return;
    setBusy(true);
    try {
      const canvas = await getPosterCanvas();
      const imgData = canvas.toDataURL("image/png");
      const win = window.open("", "_blank", "width=620,height=880");
      if (!win) { toast.error("Permita popups para imprimir."); return; }
      win.document.write(
        `<!DOCTYPE html><html><head><style>` +
        `@page{size:A5 portrait;margin:0}` +
        `*{margin:0;padding:0}` +
        `body{width:148mm;height:210mm;overflow:hidden}` +
        `img{width:148mm;height:210mm;display:block}` +
        `</style></head><body>` +
        `<img src="${imgData}" onload="window.print();window.close()"/>` +
        `</body></html>`
      );
      win.document.close();
    } catch {
      toast.error("Erro ao preparar impressão.");
    } finally {
      setBusy(false);
    }
  }

  async function shareOrWhatsapp() {
    if (!qrDataUrl || busy) return;
    setBusy(true);
    try {
      const canvas = await getPosterCanvas();
      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("blob null"))), "image/png")
      );
      const file = new File([blob], `poster-${slug}.png`, { type: "image/png" });
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: eventName, text: "Faça sua pergunta!" });
      } else {
        const text = `${eventName}\n\nFaça sua pergunta: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") toast.error("Não foi possível compartilhar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-title"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(6px)", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "hsl(var(--background))", borderRadius: 20, padding: 24, maxWidth: 480, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,.4)", display: "flex", flexDirection: "column", gap: 16, maxHeight: "calc(100dvh - 32px)", overflow: "auto" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 id="qr-title" style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 20, margin: 0 }}>Poster do evento</h2>
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: "4px 0 0" }}>
              Formato A5 · identidade visual do evento
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", cursor: "pointer", flexShrink: 0 }}>
            <X size={16} aria-hidden />
          </button>
        </div>

        {/* Poster preview */}
        <div style={{ borderRadius: 12, overflow: "hidden", background: "hsl(var(--muted))", aspectRatio: "148 / 210", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
          {previewDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewDataUrl}
              alt="Poster do evento"
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          ) : (
            <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Gerando poster…</span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <ActionButton
            icon={<Download size={15} aria-hidden />}
            label="Baixar PDF"
            onClick={downloadPdf}
            disabled={!previewDataUrl || busy}
            primary
          />
          <ActionButton
            icon={<Printer size={15} aria-hidden />}
            label="Imprimir"
            onClick={printPoster}
            disabled={!previewDataUrl || busy}
          />
          <ActionButton
            icon={<Share2 size={15} aria-hidden />}
            label="WhatsApp"
            onClick={shareOrWhatsapp}
            disabled={!previewDataUrl || busy}
          />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, disabled, primary }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 72,
        borderRadius: 12,
        border: primary ? "none" : "1px solid hsl(var(--border))",
        background: primary ? "hsl(var(--primary))" : "hsl(var(--muted))",
        color: primary ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 12,
        fontWeight: 600,
        opacity: disabled ? 0.5 : 1,
        fontFamily: "inherit",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
