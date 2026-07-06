import type { Metadata } from "next";
import { headers } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "voz. — Perguntas ao vivo",
    template: "%s · voz.",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "voz. — Perguntas ao vivo",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "voz. — Perguntas ao vivo",
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Reading the per-request `x-nonce` header (set by the nonce-based CSP in
  // `src/proxy.ts`) opts the whole app into dynamic rendering. This is required
  // so Next injects the request's nonce into its framework scripts on every
  // page; static prerendering would emit scripts without a nonce, which the
  // strict `script-src 'strict-dynamic'` policy would then block at runtime.
  //
  // The nonce is also forwarded to `<ClerkProvider>`: Clerk emits its
  // `clerk.browser.js`/`ui.browser.js` as server-rendered `<script src>` tags,
  // which are parser-inserted and therefore NOT covered by `'strict-dynamic'`
  // propagation — they need an explicit `nonce` attribute or CSP blocks them.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <ClerkProvider
      nonce={nonce}
      localization={ptBR}
      signInUrl="/entrar"
      signUpUrl="/cadastro"
      signInFallbackRedirectUrl="/pos-login"
      signUpFallbackRedirectUrl="/pos-login"
    >
      <html lang="pt-BR" className="h-full">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,500;0,600;0,700;1,500&family=Archivo+Black&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
