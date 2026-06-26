# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] — 2026-05-25

### Added
- **SaaS multi-tenant**: múltiplas contas com plano gratuito (1 evento, 15 perguntas) e eventos pagos via Stripe (R$ 59,90/evento)
- Registro público de organizers em `/cadastro`
- Dashboard do organizer em `/dashboard`
- Pagamento por evento via Stripe Checkout
- Webhook Stripe para processamento de pagamentos (`/api/webhooks/stripe`)
- Portabilidade de dados LGPD (`GET /api/v1/me/data-export`)
- Direito ao esquecimento LGPD (`DELETE /api/v1/me/data`)
- Página de privacidade em `/dashboard/conta`
- Páginas de retorno pós-pagamento (`/pagamento/sucesso`, `/pagamento/cancelado`)

### Changed
- `POST /api/v1/events`: owners com 1+ evento no plano free recebem `402 PAYMENT_REQUIRED`
- `GET /api/v1/events`: owners veem apenas seus próprios eventos
- `GET|PATCH|DELETE /api/v1/events/:id`: verificação de ownership para owners
- `POST /api/v1/events/:id/questions`: limite de 15 perguntas para eventos no plano free
- Login redireciona owners para `/dashboard`, admins para `/admin/eventos`

### Schema
- Adicionado role `owner` ao enum `user_role`
- Adicionada coluna `plan` (`free`|`paid`) em `users`
- Nova tabela `event_payments`

## [Unreleased]

### Security
- **BOLA/BFLA scoping**: Todas as rotas que mutam/lêm dados de eventos agora validam permissão por `event_id` — owners veem apenas seus eventos, mediadores apenas eventos atribuídos, admins têm acesso global (ADR 010).
- **GET público sem PII**: `GET /api/v1/events/[eventId]/questions` agora retorna projeção mínima sem `author_email`, `author_contact`, `author_ip`. Perguntas anônimas exibem "Anônimo" como nome (ADR 011).
- **RLS habilitado**: Migration 20260625000002 ativa Row-Level Security em `users`, `events`, `questions`, `registrations`, `participants`, `event_payments`, `mediator_assignments`. Policies por `organizer_id` e atribuição; service-role (server) continua funcionando.
- **Register cria owner, nunca admin**: `POST /api/auth/register` força `role: "owner"`. Privilégio `superadmin` só via seed/manual (mitiga BFLA).
- **Rate limiting**: `register` e `signIn` limitados a 5 tentativas por email em 15 min. Submissão de perguntas: 10/hora por IP. (ADR 011).
- **Upload rejeita SVG**: `POST /api/v1/upload` valida allowlist (JPEG, PNG, WebP) — SVG bloqueado por risco XSS.
- **CSP+HSTS**: Headers `Content-Security-Policy` (sem `unsafe-eval`) e `Strict-Transport-Security` configurados em `next.config.ts`.

### Privacy
- **Direito ao esquecimento LGPD**: `DELETE /api/v1/events/[id]/registrations/[regId]` anonimiza registro. `DELETE /api/v1/me/data` anonimiza todos os dados do owner (ADR 008).
- **Cleanup LGPD**: `/api/v1/internal/cleanup` executa diariamente (Vercel Cron) — anula `author_ip` de perguntas e inscrições com 30+ dias (ADR 008).
- **Logs sanitizados**: `logError()` extrai apenas `message`, `code`, `name` — nunca registra objeto bruto de erro ou PII.
- **Minimização de CPF**: Campo `document` em registrações agora opcional (não coletado por padrão). Retenção de IP: 30 dias.
- **Dados exportáveis**: `GET /api/v1/me/data-export` — direito de acesso (portabilidade) LGPD implementado.

### Types
- **NextAuth augmentation**: `types/next-auth.d.ts` estende `Session.user` com `id`, `role`, `plan` — elimina casts `as unknown as`.
- **Database types**: `src/lib/db/database.types.ts` gerado com Drizzle — rotas usam `createClient<Database>()` sem `eslint-disable no-explicit-any`.
- **Superadmin no Zod**: Schema de criação de user explicitamente exclui `superadmin` (documentado em `createUserSchema`). Schemas broadcast validam payloads realtime.
- **WSMessage union**: Tipo discriminado com `question:deleted` agora incluído.

### Architecture
- **Auth guard compartilhado**: `src/lib/api/auth-guard.ts` centraliza `requireRole()` e `requireEventAccess()`. Middleware.ts protege `/api/v1/*`.
- **Mappers centralizados**: `src/lib/api/mappers.ts` e `src/lib/api/question-mappers.ts` — `mapEvent()`, `mapQuestion()`, `mapQuestionPublic()`, `mapRegistration()` reutilizados em todas as rotas.
- **Enums e FKs**: Schema Drizzle define `plan` e `role` como enums; FKs com `onDelete: "cascade"` ou `"set null"` coerente.
- **ADR 009**: SaaS multi-tenant aprovado — free plan: 1 evento, 15 questões; paid: ilimitado.

### Tests
- **Coverage.include atualizado**: `vitest.config.ts` agora cobre `src/lib/**` e `src/app/api/**` — target 80%.
- **Novos testes**: auth (rate limit), stripe/checkout, plataforma/*, lgpd (export/anonymize), participants, upload (svg reject).

### Docs
- **OpenAPI 3.0**: `docs/api-spec.openapi.yaml` — cobertura completa de endpoints, status codes, schemas, auth.
- **tsdoc**: Exports públicos de `src/lib/**` e componentes `src/components/voz/**` documentados.
- **LGPD governance**: Drafts criados em `docs/privacy/` — aviso-de-privacidade.md, ropa.md, ripd.md, direitos-do-titular.md (sujeito a revisão jurídica).

### Fixed
- **Cron de cleanup/keep-alive não executava**: o Vercel Cron dispara `GET`, mas a rota `/api/v1/internal/cleanup` só expunha `DELETE` (405) e `CRON_SECRET` não estava no projeto Vercel (apenas no GitHub Actions). Resultado: a limpeza LGPD nunca rodou e o projeto Supabase free pausava por inatividade. Adicionado handler `GET` (mantendo `DELETE` para uso manual) e `CRON_SECRET` setado no Vercel. A execução diária agora também mantém o banco ativo.

### Added — Pendências de produção (#45)
- **Supabase Storage**: migration `20260521000003_storage_voz_assets.sql` cria bucket `voz-assets` (público, 3 MB, tipos de imagem) com policies de leitura pública e escrita autenticada
- **LGPD Cleanup Cron**: `DELETE /api/v1/internal/cleanup` — anula `author_ip` de perguntas e inscrições com mais de 30 dias; protegido por `Bearer CRON_SECRET` com `timingSafeEqual`; Vercel Cron configurado para rodar diariamente às 03:00 UTC
- **E2E no CI**: novo job `e2e` em `.github/workflows/ci.yml` — instala Playwright chromium, roda `pnpm test:e2e` apenas em push para main (`continue-on-error: true` até staging estar disponível)
- **Secrets configurados**: `CRON_SECRET`, `E2E_BASE_URL`, `E2E_EVENT_SLUG` adicionados ao repositório via `gh secret set`

### Security
- `timingSafeEqual` (Node.js `crypto`) em vez de `===` para comparação do `CRON_SECRET` — previne timing attacks

### Added — Backlog completo (#38–#43)
- **Playwright E2E**: 3 specs cobrindo inscrição pública, Q&A e credenciamento do mediador; `playwright.config.ts`; scripts `test:e2e` e `test:e2e:ui`
- **Realtime check-in**: PATCH `/registrations/[regId]` publica evento `registration:updated` via Supabase Realtime; `/mediador/credenciamento` subscreve e atualiza lista sem reload
- **CSV export**: botão "Exportar CSV" na aba Inscrições do editor de eventos; BOM UTF-8; 7 colunas; download client-side
- **Upload de capa**: campo de upload com preview na aba Sobre do editor; armazena URL em `config.page.coverUrl`; exibida como banner 200px na landing pública
- **Página `/e/[slug]/programacao`**: lista cronológica da grade do evento; usa `config.page.schedule` já existente
- **ADR-008**: política LGPD para `author_ip` (PII, rate-limit only, não exposto via API)

### Security — LGPD (#39)
- `author_ip` removido das funções `mapQuestion` em `/questions` e `/events/[eventId]/questions`
- `authorIp` removido do type público `Question`
- Comentário PII adicionado ao schema Drizzle em `questions.authorIp` e `registrations.authorIp`

### Fixed
- `Shuffle` icon ausente no import de `dashboard.tsx` (pré-existente)
- Unescaped entities `"Adicionar"` e `"Incluir"` em `editor.tsx` → `&quot;`

### Tests
- 166 testes unitários passando (14 arquivos Vitest + 8 novos: csv.test.ts, regId/route.test.ts)
- Vitest configurado para excluir `e2e/**` (evita conflito com Playwright)

### Added — Módulo de Inscrições e Sorteio (#35–#36)
- **DB**: Tabela `registrations` com campos: id, event_id, name, email, phone, document, checked_in, kit_delivered, drawn, lgpd_accepted, created_at. Unique index em (event_id, email)
- **Types**: `Registration`, `RegistrationConfig` em `src/lib/types.ts`; `EventConfig.registration` como campo opcional
- **Schemas Zod**: `createRegistrationSchema`, `patchRegistrationSchema` em `src/lib/schemas.ts`
- **API `GET/POST /api/v1/events/[id]/registrations`**: listagem (admin+mediador) e inscrição pública com validação de período
- **API `PATCH /api/v1/events/[id]/registrations/[regId]`**: atualização de check-in e entrega de kit (admin+mediador)
- **API `POST /api/v1/events/[id]/draw`**: sorteio aleatório de inscrito com check-in, marca como drawn. Apenas inscritos com check-in participam
- **API `DELETE /api/v1/events/[id]/draw`**: reset do sorteio (admin only)
- **Página pública `GET /e/{slug}/inscricao`**: formulário de inscrição com validação de período (aberto/ainda-não-aberto/encerrado)
- **Página pública `GET /e/{slug}/inscricao/confirmacao`**: confirmação com QR Code para credenciamento
- **Admin editor**: abas "Inscrições" (config + lista) e "Sorteio" (countdown 5s + nome do sorteado) no editor de eventos
- **Mediador**: nova página `/mediador/credenciamento` com abas "Credenciamento" (busca, check-in, kit) e "Sorteio"
- **Testes**: 18 testes unitários para as rotas de registrations e draw (cobertura de auth, validação, happy path, edge cases)

### Added — Ajustes de autenticação e header (#34–#35)
- Redirect pós-login baseado em role: admin → `/admin/eventos`, mediador → `/mediador`
- `HeaderControls` component: email do usuário logado, botão Sair, ThemeToggle — fixo no header de todas as páginas admin
- Toggle dark/light removido do layout flutuante e integrado ao header

### Added — Admin + Mediador MVP (#19–#33)
- Full REST API for event management: `GET/POST /api/v1/events`, `GET/PATCH/DELETE /api/v1/events/[id]`
- Full REST API for user management: `GET/POST /api/v1/users`, `GET/PATCH/DELETE /api/v1/users/[id]`
- Mediator assignment API: `GET/POST /api/v1/events/[id]/mediators`, `DELETE /api/v1/events/[id]/mediators/[userId]`
- `GET /api/v1/me/assignments` — returns all events for admin, assigned events for mediador
- `src/middleware.ts` — route-level protection for `/admin/*` (admin only) and `/mediador/*` (admin + mediador)
- Admin UI: events list, new event form, event editor with mediators tab and settings tab
- Admin UI: users management page with inline create/edit/delete
- Mediador dashboard wired to real API — loads assigned event dynamically, no hardcoded IDs
- Presentation mode wired to real event via `?eventId=` query param
- Zod schemas for all new API inputs (`createEventSchema`, `patchEventSchema`, `createUserSchema`, `patchUserSchema`, `assignMediatorSchema`)
- UNIQUE constraint on `mediator_assignments(event_id, user_id)` via Drizzle schema
- ADR-005: Access management MVP — manual credential sharing pattern
- ADR-006: Mediator event ownership via `mediator_assignments` table
- Vitest test suite for all new API routes — 133 tests, ≥80% branch coverage

### Added
- Dark mode as default theme for `/admin` and `/mediador` routes (closes #15, #16, #17, #18)
- `AdminThemeProvider` — scoped Client Component that applies `.dark` class to a wrapper div, persists preference in `localStorage` with key `theme-admin`
- `ThemeToggle` — discrete Sun/Moon icon button in the top-right corner of admin/mediador layouts
- Dedicated `layout.tsx` for `/admin` and `/mediador` routes with scoped `Toaster`
- ADR-004 documenting the dark mode architecture decision
- Vitest jsdom environment for React component tests (`AdminThemeProvider`, `ThemeToggle`)

### Changed
- `Toaster` moved from root layout to individual sub-layouts (admin, mediador) for correct theme scoping

### Security
- Add authentication guard to `PATCH /api/v1/questions/[id]` — previously unauthenticated
- Add rate limiting to `POST /api/v1/events/[eventId]/questions` — max 10/hour per IP
- Add HTTP security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Enforce `.env` exclusion from Git tracking

### Added
- Zod validation schemas (`src/lib/schemas.ts`) for all API route inputs
- Vitest test suite — schemas, PATCH route, POST route (≥80% coverage target)
- GitHub Actions CI workflow (lint + typecheck + tests)
- `pnpm typecheck` and `pnpm test:coverage` scripts

### Changed
- Replaced manual `if` validation in API routes with Zod schemas
- Updated `.gitignore` to block `.env`, `.env.*` and `DXS_y40+!` artifact
- Updated README.md with full project documentation

### Documentation
- 🐙 Octechpus Agent Orchestrator System v2.3.0
- ADR 001: Database — Supabase + Drizzle ORM
- ADR 002: Authentication — NextAuth v5 Credentials
- ADR 003: UI — shadcn/ui Design System
- GitHub issue templates (bug, feature, refactor)
- PR template with Octechpus pipeline report

## [0.1.0] — 2025-05-21

### Added
- Initial project setup from Create Next App
- Next.js 16 App Router with TypeScript strict
- Live Q&A system for INCLUIR 2025 conference
- Public question form with LGPD consent
- Mediator dashboard with Supabase Realtime updates
- Presentation mode (full-screen question display)
- Admin panel for events and user management
- JWT authentication with role-based access (admin | mediador)
- Drizzle ORM schema: events, questions, users, participants, mediator_assignments
- Supabase integration (PostgreSQL + Realtime broadcast)
- NextAuth v5 beta with Credentials provider and bcrypt (12 rounds)
- shadcn/ui component library with Tailwind v4
- Vercel deployment configuration (region: gru1 — São Paulo)
- Seed endpoint (`POST /api/seed`) for initial data setup
- QR code generation for event sharing
