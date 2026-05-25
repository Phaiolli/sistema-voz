import Link from "next/link";
import { VozWordmark } from "@/components/voz/wordmark";

export default function PagamentoCanceladoPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2rem",
        padding: "2rem",
        background: "hsl(var(--background))",
      }}
    >
      <VozWordmark size={32} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          textAlign: "center",
          maxWidth: "28rem",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "hsl(var(--muted))",
            color: "hsl(var(--muted-foreground))",
            fontSize: 28,
          }}
        >
          ✕
        </span>

        <h1
          style={{
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: "1.5rem",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            color: "hsl(var(--foreground))",
            margin: 0,
          }}
        >
          Pagamento cancelado
        </h1>

        <p
          style={{
            fontSize: "1rem",
            color: "hsl(var(--muted-foreground))",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Nenhum valor foi cobrado. Você pode tentar novamente.
        </p>

        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: "2.5rem",
            padding: "0 1.5rem",
            borderRadius: "0.5rem",
            background: "hsl(var(--accent))",
            color: "hsl(var(--accent-foreground))",
            fontWeight: 600,
            fontSize: "0.875rem",
            textDecoration: "none",
            marginTop: "0.5rem",
          }}
        >
          Voltar ao dashboard
        </Link>
      </div>
    </main>
  );
}
