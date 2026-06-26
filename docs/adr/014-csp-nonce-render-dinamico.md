# ADR-014: CSP baseada em nonce + renderização dinâmica

**Status:** Accepted  
**Date:** 2026-06-26  
**Issue:** follow-up de segurança FU1 (H4/CSP — remoção de `unsafe-inline` de `script-src`)

## Context

A CSP anterior (estática, em `next.config.ts`) usava
`script-src 'self' 'unsafe-inline'`, o que neutraliza a proteção do `script-src`
contra XSS: qualquer `<script>` inline injetado seria executado. O `unsafe-eval`
já havia sido removido. O audit (H4) pediu o endurecimento do `script-src` para
eliminar o `unsafe-inline`.

O Next.js (App Router) injeta scripts de bootstrap/framework inline. Para
removê-los do `unsafe-inline` sem quebrar a aplicação, o caminho oficial é
**CSP baseada em nonce**: um nonce único por request é gerado no proxy
(`src/proxy.ts`), propagado ao renderizador via header `x-nonce`, e o Next
aplica esse nonce automaticamente aos próprios scripts. `'strict-dynamic'`
estende a confiança aos scripts que esses scripts nonce'd carregam (o chunk
loader do Next).

## Decision

1. **CSP por nonce no proxy.** `src/proxy.ts` gera
   `Buffer.from(crypto.randomUUID()).toString("base64")` por request e monta:
   `script-src 'self' 'nonce-<n>' 'strict-dynamic'` (+ `'unsafe-eval'` **apenas**
   em `NODE_ENV=development`, exigido pelo overlay de erro do React; nunca em
   produção). Inclui `upgrade-insecure-requests`, `base-uri 'self'`,
   `form-action 'self'`, `object-src 'none'`, `frame-ancestors 'none'`.
   O nonce vai no request header `x-nonce` (via
   `NextResponse.next({ request: { headers } })`) e no response header
   `Content-Security-Policy`. Os redirects dos guards de auth também recebem a
   CSP, para não existir resposta sem o header.

2. **CSP removida do `next.config.ts`.** Só a CSP migrou para o proxy; os demais
   headers de segurança (HSTS, X-Frame-Options, X-Content-Type-Options,
   Referrer-Policy, Permissions-Policy) permanecem estáticos no `next.config.ts`.
   Não há header duplicado/conflitante.

3. **Renderização 100% dinâmica.** Nonces exigem renderização dinâmica: uma
   página pré-renderizada estaticamente não tem o nonce do request, e sob
   `'strict-dynamic'` seus scripts seriam bloqueados em runtime. Para garantir
   que o nonce seja injetado em todas as páginas, o `RootLayout`
   (`src/app/layout.tsx`) lê `await headers()`, o que opta toda a árvore em
   renderização dinâmica. No build, todas as rotas passam a `ƒ (Dynamic)`
   (exceto `/icon`, gerador de imagem sem scripts).

## Consequences

- **Perda de prerender estático/CDN nas páginas públicas.** Páginas como
  `/e/[slug]`, `/cadastro` e `/entrar` deixam de ser servidas como HTML estático
  cacheável na borda e passam a renderizar sob demanda. **Trade-off aceito:** o
  ganho de segurança (eliminar `unsafe-inline` de `script-src`, fechando o vetor
  de XSS por script inline) supera o ganho de performance/cache do estático neste
  app, que é majoritariamente autenticado e com conteúdo dinâmico por evento.
  PPR e ISR ficam incompatíveis com esta abordagem enquanto o nonce for usado.

- **Resíduo `style-src 'unsafe-inline'`.** Mantido porque Tailwind/shadcn e o
  Next injetam estilos inline sem nonce. **Risco baixo e aceito:** estilo inline
  **não executa script**; o vetor crítico (XSS via `<script>`) está coberto pelo
  `script-src` por nonce. Endurecer `style-src` para nonce/hash exigiria
  refatorar a pipeline de estilos e fica como evolução futura, não bloqueante.

- **`'strict-dynamic'` ignora allowlists de host em `script-src`.** Scripts de
  terceiros futuros precisarão de nonce (via `next/script` com `nonce`) ou de um
  hash; não bastará adicionar o domínio ao `script-src`. Hoje o app não carrega
  script de terceiros no `script-src`.

- **Dev vs prod.** `'unsafe-eval'` só aparece em desenvolvimento. A diferença é
  intencional e documentada no JSDoc de `buildCsp` em `src/proxy.ts`.
