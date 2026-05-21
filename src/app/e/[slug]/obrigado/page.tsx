import Link from "next/link";
import { VozWordmark } from "@/components/voz/wordmark";

export default async function ObrigadoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, padding: "24px 28px 36px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
        <div
          style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "pop-in 380ms cubic-bezier(.2,.9,.3,1.2)",
          }}
          role="img"
          aria-label="Sucesso"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <div>
          <h1 style={{ fontFamily: '"Archivo Black", sans-serif', fontWeight: 900, fontSize: 44, lineHeight: 1, letterSpacing: "-0.02em", color: "#fff", margin: "0 0 12px" }}>
            Recebemos sua<br />pergunta<span style={{ color: "hsl(var(--accent))" }}>.</span>
          </h1>
          <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 18, lineHeight: 1.5, margin: 0 }}>
            O mediador vai escolher quais perguntas levar ao palco.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link
            href={`/e/${slug}/perguntar`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: 52, borderRadius: 10, textDecoration: "none",
              background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))",
              fontSize: 16, fontWeight: 700,
            }}
          >
            Fazer outra pergunta
          </Link>
          <Link
            href={`/e/${slug}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: 52, borderRadius: 10, textDecoration: "none",
              background: "hsl(var(--muted))", color: "#fff",
              fontSize: 16, fontWeight: 600,
            }}
          >
            Voltar para o evento
          </Link>
        </div>
      </div>

      <footer style={{ padding: "16px 24px 24px", textAlign: "center" }}>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 12, margin: 0 }}>
          powered by <VozWordmark size={12} inverse />
        </p>
      </footer>
    </main>
  );
}
