import { Download } from "lucide-react";

interface TabQrcodeProps {
  qrDataUrl: string | null;
  slug: string;
  downloadQr: (format: "png") => void;
}

export function TabQrcode({ qrDataUrl, slug, downloadQr }: TabQrcodeProps) {
  return (
    <div style={{ maxWidth: 500 }}>
      <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: "0 0 20px" }}>QR Code</h2>
      <div style={{ background: "#fff", border: "1px solid hsl(var(--border))", borderRadius: 16, padding: 24, textAlign: "center", marginBottom: 16 }}>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`QR Code para /e/${slug}`} width={280} height={280} style={{ display: "block", margin: "0 auto" }} />
        ) : (
          <div style={{ width: 280, height: 280, margin: "0 auto", background: "hsl(var(--muted))", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
            {slug ? "Gerando…" : "Salve o slug primeiro"}
          </div>
        )}
      </div>
      <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: "hsl(var(--muted-foreground))", textAlign: "center", marginBottom: 16 }}>
        {window?.location?.origin ?? "https://sistema-voz-beta.vercel.app"}/e/{slug || "slug-do-evento"}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => downloadQr("png")}
          disabled={!qrDataUrl}
          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 14, cursor: qrDataUrl ? "pointer" : "not-allowed", opacity: qrDataUrl ? 1 : 0.5 }}
        >
          <Download size={14} aria-hidden /> Baixar PNG
        </button>
      </div>
    </div>
  );
}
