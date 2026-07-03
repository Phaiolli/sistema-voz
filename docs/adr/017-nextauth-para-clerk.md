# ADR-017: Migração de NextAuth para Clerk

**Status:** Accepted
**Date:** 2026-07-03
**Supersedes:** ADR-013 (no ponto do `next-auth`; a decisão de produto PT-BR único segue válida)

## Context

Até aqui a autenticação era `next-auth@5.0.0-beta.31` com provider
`Credentials` (email/senha + `bcryptjs`), sessão JWT e `role`/`plan` lidos da
tabela `users` no Supabase (ver ADR-013). A dependência de um beta em produção já
era um risco assumido conscientemente.

A decisão foi trocar o provedor de auth por **Clerk** (`@clerk/nextjs`), que já
está provisionado (chaves em `.env`). Isso remove o beta de produção e entrega,
sem código próprio, MFA, login social e reset de senha — que hoje não existem.

Restrições que moldam o desenho:

1. **`users.id` (text PK) é referenciado por FKs** — `events.organizer_id`,
   `mediator_assignments.user_id`, `event_payments.owner_id`. O identificador de
   aplicação **precisa permanecer estável** na migração.
2. **`role`/`plan` governam autorização** em três lugares: middleware
   (`src/proxy.ts`), guards de API (`src/lib/api/auth-guard.ts`) e layouts.
3. **CSP estrita com nonce + `strict-dynamic`** (ADR-014) roda no middleware. O
   Clerk injeta scripts e abre conexões para seus domínios, o que precisa ser
   reconciliado com a política.
4. Existem **usuários em produção com hash bcrypt** que devem continuar logando
   com a mesma senha.

## Decision

1. **Clerk como único provedor de auth.** Remover `next-auth`, `bcryptjs`,
   `src/lib/auth.ts`, `api/auth/[...nextauth]` e `api/auth/register`.

2. **Supabase segue a fonte da verdade de `role`/`plan`.** A tabela `users` é
   mantida. O `role`/`plan` são espelhados no `publicMetadata` do usuário no
   Clerk e expostos no **session token** (claims customizadas), para o middleware
   ler sem hit no banco.

3. **`externalId` do Clerk = `users.id` atual.** Assim o id de aplicação usado em
   FKs e guards não muda: `auth().sessionClaims` carrega o `externalId`, e todo
   `user.id` na aplicação continua sendo o mesmo `text` de antes. Nenhuma FK
   quebra. Uma coluna `users.clerk_id` (unique) guarda o mapeamento reverso para
   o webhook.

4. **Sincronização via webhook** `POST /api/webhooks/clerk`, verificado por svix.
   `user.created`/`user.updated` fazem upsert em `users`; `user.deleted` remove.
   Substitui o antigo fluxo de registro custom.

5. **Migração de usuários existentes** por script one-off: cada `users` vira um
   usuário no Clerk com `password_digest` (bcrypt preservado, `password_hasher:
   'bcrypt'`), `external_id = users.id` e `public_metadata {role, plan}`. O
   `clerk_id` retornado é gravado de volta. Usuários logam com a senha atual.

6. **`password_hash` torna-se nullable.** Usuários criados após a migração (via
   Clerk) não têm hash local; o Clerk é o guardião da credencial.

7. **Telas `/entrar` e `/cadastro`** passam a montar `<SignIn>`/`<SignUp>` do
   Clerk, localizados em PT-BR (`@clerk/localizations`). O form custom é
   descartado — princípio de simplicidade primeiro.

## Consequences

**Positivo**
- Sai o beta de produção; auth passa a ser serviço gerenciado.
- MFA, login social e reset de senha sem código próprio.
- Menos superfície própria de segurança (hashing, rate-limit de login, sessão).

**Negativo / custo**
- Dependência externa nova (Clerk) no caminho crítico de login.
- **Passo manual no Clerk Dashboard** (fora do código): customizar o session
  token para incluir `role`/`plan` do `public_metadata`, e criar o endpoint de
  webhook (gera `CLERK_WEBHOOK_SIGNING_SECRET`, ainda ausente do `.env`).
- CSP precisa liberar os domínios do Clerk (`connect-src`, `script-src`,
  `img-src`, `worker-src`) — ver atualização em `src/proxy.ts`.
- O rate-limit de login por email/IP (ADR-011) deixa de existir na app; passa a
  ser responsabilidade do Clerk (que já aplica proteção anti-abuso nativa).

## Alternatives Considered

- **Manter NextAuth e apenas sair do beta quando estável:** não entrega MFA/social/
  reset sem trabalho próprio e mantém a superfície de segurança na app.
  Descartado dada a disponibilidade do Clerk provisionado.
- **Mover `role`/`plan` inteiramente para o Clerk (metadata como verdade):**
  exigiria refatorar `plan-limits`, billing e FKs que apontam para `users.id`.
  Descartado — Supabase como fonte da verdade minimiza a mudança (mudanças
  cirúrgicas).
- **Coexistir Clerk + NextAuth:** duas sessões e dois middlewares, sem ganho
  real. Descartado.
