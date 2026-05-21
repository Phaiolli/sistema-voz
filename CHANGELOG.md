# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
