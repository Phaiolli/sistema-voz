import { Download } from "lucide-react";

interface TabQrcodeProps {
  qrDataUrl: string | null;
  slug: string;
  downloadQr: (format: "png") => void;
}

export function TabQrcode({ qrDataUrl, slug, downloadQr }: TabQrcodeProps) {
  return (
    <div style={{ maxWidth: 500 }}>
      <h2 className="font-bold text-[22px] mt-0 mb-5 mx-0" style={{ fontFamily: '"Archivo", sans-serif' }}>QR Code</h2>
      <div className="bg-white border border-border rounded-2xl p-6 text-center mb-4">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`QR Code para /e/${slug}`} width={280} height={280} className="block mx-auto" />
        ) : (
          <div className="w-[280px] h-[280px] mx-auto bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-[13px]">
            {slug ? "Gerando…" : "Salve o slug primeiro"}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center mb-4" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
        {window?.location?.origin ?? "https://sistema-voz-beta.vercel.app"}/e/{slug || "slug-do-evento"}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => downloadQr("png")}
          disabled={!qrDataUrl}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg border border-border bg-transparent text-sm"
          style={{ cursor: qrDataUrl ? "pointer" : "not-allowed", opacity: qrDataUrl ? 1 : 0.5 }}
        >
          <Download size={14} aria-hidden /> Baixar PNG
        </button>
      </div>
    </div>
  );
}
