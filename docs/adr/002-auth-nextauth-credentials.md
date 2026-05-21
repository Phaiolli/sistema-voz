# ADR 002 — Authentication: NextAuth v5 Credentials

**Status:** Accepted
**Date:** 2025-05-21

## Context

O sistema tem dois tipos de usuário autenticado (mediador, admin) com email + senha. Participantes não se autenticam. Precisamos de autenticação simples, sem OAuth externo, com controle total sobre o cadastro de usuários.

## Decision

Usar **NextAuth v5 (beta)** com **Credentials provider** e **bcrypt** para hash de senha.

- Credentials provider com bcrypt (salt rounds: 12) para validação de senha
- Estratégia JWT para sessões (sem sessões no banco)
- Callbacks JWT/session para propagar `role` no token
- Middleware (`src/proxy.ts`) protege `/admin` e `/mediador`

## Consequences

**Positivo:**
- Controle total sobre cadastro e autenticação de usuários
- Sem dependência de serviços OAuth externos
- JWT strategy: sem tabela de sessões, escalável em serverless
- NextAuth v5 suporta App Router nativamente

**Negativo:**
- NextAuth v5 ainda em beta (v5.0.0-beta.31) — API pode mudar antes do stable
- Credentials provider não suporta MFA nativamente
- Sem refresh token automático — sessão expira sem renovação automática
- AUTH_SECRET deve ser configurado manualmente em produção

## Alternatives Considered

- **Clerk:** Excelente UX mas vendor lock-in e custo por usuário ativo
- **Supabase Auth:** Integrado com Supabase mas acoplamento maior; Credentials não é o foco
- **Custom JWT:** Mais controle mas muito código para reinventar (PKCE, CSRF, etc.)
