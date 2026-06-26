import Link from "next/link";
import { VozWordmark } from "@/components/voz/wordmark";

export default function PagamentoCanceladoPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-background p-8">
      <VozWordmark size={32} />

      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground text-[28px]"
        >
          ✕
        </span>

        <h1
          className="m-0 text-2xl text-foreground"
          style={{
            fontFamily: '"Archivo Black", sans-serif',
            fontWeight: 900,
            letterSpacing: "-0.02em",
          }}
        >
          Pagamento cancelado
        </h1>

        <p className="m-0 text-base leading-[1.6] text-muted-foreground">
          Nenhum valor foi cobrado. Você pode tentar novamente.
        </p>

        <Link
          href="/dashboard"
          className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-accent px-6 text-sm font-semibold text-accent-foreground no-underline"
        >
          Voltar ao dashboard
        </Link>
      </div>
    </main>
  );
}
