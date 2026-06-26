"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { VozWordmark } from "@/components/voz/wordmark";
import { Download, CheckCircle2 } from "lucide-react";
import { generateQrWithLogo } from "@/lib/qr";

function ConfirmationContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const regId = searchParams.get("id");
  const error = !regId;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!regId) return;
    const qrUrl = `${window.location.origin}/e/${params.slug}/inscricao/confirmacao?id=${regId}`;
    generateQrWithLogo(qrUrl, 240).then(setQrDataUrl);
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
      <div className="p-10 text-center text-muted-foreground">
        Link de confirmação inválido.
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center px-6 py-10">
      <div className="w-full max-w-[420px] text-center">
        <div className="mb-7 text-left">
          <VozWordmark size={22} />
        </div>

        <div className="mb-4 inline-flex items-center gap-2" style={{ color: "hsl(142 71% 40%)" }}>
          <CheckCircle2 size={22} />
          <span className="text-lg font-bold" style={{ fontFamily: '"Archivo", sans-serif' }}>Inscrição confirmada!</span>
        </div>

        <p className="mb-7 text-sm text-muted-foreground">
          Apresente este QR Code no credenciamento para retirar seu kit.
        </p>

        <div className="mb-4 inline-block rounded-2xl border border-border bg-white p-7">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code de credenciamento" width={240} height={240} className="block" />
          ) : (
            <div className="flex h-[240px] w-[240px] items-center justify-center rounded-lg bg-muted text-[13px] text-muted-foreground">
              Gerando QR…
            </div>
          )}
        </div>

        <p className="mb-5 break-all text-[11px] text-muted-foreground" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          ID: {regId}
        </p>

        <button
          onClick={downloadQr}
          disabled={!qrDataUrl}
          className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-transparent px-5 text-sm disabled:opacity-50"
          style={{ cursor: qrDataUrl ? "pointer" : "not-allowed" }}
        >
          <Download size={15} aria-hidden /> Salvar QR Code
        </button>
      </div>
    </div>
  );
}

export default function ConfirmacaoPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Carregando…</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
