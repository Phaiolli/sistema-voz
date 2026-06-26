import Link from "next/link";
import { VozWordmark } from "@/components/voz/wordmark";

export default async function ObrigadoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <main className="flex min-h-[100dvh] flex-col">
      <div className="flex flex-1 flex-col justify-center gap-5 px-7 pt-6 pb-9">
        <div
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-accent text-accent-foreground"
          style={{ animation: "pop-in 380ms cubic-bezier(.2,.9,.3,1.2)" }}
          role="img"
          aria-label="Sucesso"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <div>
          <h1 className="mb-3 text-[44px] font-black leading-none text-white" style={{ fontFamily: '"Archivo Black", sans-serif', letterSpacing: "-0.02em" }}>
            Recebemos sua<br />pergunta<span className="text-accent">.</span>
          </h1>
          <p className="m-0 text-lg leading-normal text-muted-foreground">
            O mediador vai escolher quais perguntas levar ao palco.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <Link
            href={`/e/${slug}/perguntar`}
            className="flex h-[52px] items-center justify-center rounded-[10px] bg-accent text-base font-bold text-accent-foreground no-underline"
          >
            Fazer outra pergunta
          </Link>
          <Link
            href={`/e/${slug}`}
            className="flex h-[52px] items-center justify-center rounded-[10px] bg-muted text-base font-semibold text-white no-underline"
          >
            Voltar para o evento
          </Link>
        </div>
      </div>

      <footer className="px-6 pt-4 pb-6 text-center">
        <p className="m-0 text-xs text-muted-foreground">
          powered by <VozWordmark size={12} inverse />
        </p>
      </footer>
    </main>
  );
}
