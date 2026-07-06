import Link from "next/link";
import { VozWordmark } from "@/components/voz/wordmark";

/**
 * Shared shell for static legal/compliance pages (Privacy Policy, Terms of Use).
 * Renders a simple, readable document layout with the brand header and a footer
 * cross-linking the other legal documents.
 */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  /** Human-readable "last updated" label, e.g. "6 de julho de 2026". */
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-[760px] flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between gap-4 border-b border-border pb-6">
        <Link href="/" aria-label="Voltar para o início">
          <VozWordmark size={24} />
        </Link>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/privacidade" className="hover:text-foreground">
            Privacidade
          </Link>
          <Link href="/termos" className="hover:text-foreground">
            Termos
          </Link>
        </nav>
      </header>

      <article className="prose-legal flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Última atualização: {updatedAt}
          </p>
        </div>
        {children}
      </article>

      <footer className="mt-4 border-t border-border pt-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          ← Voltar para o início
        </Link>
      </footer>
    </main>
  );
}

/** Section heading inside a legal document. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
