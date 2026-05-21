# ADR 001 — Database: Supabase + Drizzle ORM

**Status:** Accepted
**Date:** 2025-05-21

## Context

O projeto precisa de PostgreSQL gerenciado com suporte a WebSocket para atualizações em tempo real (perguntas chegando ao dashboard do mediador sem polling).

## Decision

Usar **Supabase** como plataforma de banco de dados e **Drizzle ORM** para acesso ao PostgreSQL.

- **Supabase** fornece PostgreSQL gerenciado + Realtime (broadcast via WebSocket) + pooler serverless (PgBouncer) em uma só plataforma.
- **Drizzle ORM** fornece tipagem TypeScript estrita, migrations declarativas e queries type-safe sem overhead de runtime pesado.

## Consequences

**Positivo:**
- Realtime broadcast nativo sem infraestrutura adicional
- Schema type-safe com Drizzle evita erros de nomenclatura de colunas
- Pooler de conexões (porta 6543) funciona bem em serverless (Vercel Functions)
- Supabase anon key permite cliente browser sem expor credenciais críticas

**Negativo:**
- Dependência de vendor (Supabase) para Realtime — migrar seria custoso
- next-auth v5 beta usa `SUPABASE_SERVICE_ROLE_KEY` no servidor — chave poderosa que requer proteção
- Drizzle 0.x ainda em desenvolvimento ativo — breaking changes possíveis

## Alternatives Considered

- **Prisma + Planetscale:** Prisma tem overhead de runtime maior e Planetscale não tem WebSocket nativo
- **Drizzle + Neon + Pusher:** Mais componentes para gerenciar; Supabase consolida tudo
- **MongoDB:** Sem suporte a WebSocket broadcast nativo e schema menos rígido
