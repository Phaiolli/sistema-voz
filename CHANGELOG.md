# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
