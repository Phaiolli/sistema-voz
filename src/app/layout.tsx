import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "voz. — Perguntas ao vivo",
  description: "Sistema de perguntas ao vivo para eventos presenciais.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the per-request `x-nonce` header (set by the nonce-based CSP in
  // `src/proxy.ts`) opts the whole app into dynamic rendering. This is required
  // so Next injects the request's nonce into its framework scripts on every
  // page; static prerendering would emit scripts without a nonce, which the
  // strict `script-src 'strict-dynamic'` policy would then block at runtime.
  await headers();

  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,500;0,600;0,700;1,500&family=Archivo+Black&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
