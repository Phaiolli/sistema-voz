# ADR-016: `superadmin` como superset do `admin`

**Status:** Proposed  
**Date:** 2026-06-26  
**Issue:** remediação do audit 2026-06-25 (SW3 — super admin superset)

## Context

`superadmin` é o perfil do **dono da plataforma**. A intenção é que ele seja um
**superset** do `admin`: tudo que um `admin` pode fazer, o `superadmin` também
pode, somado à visão global da plataforma. Na prática, várias rotas listavam
explicitamente os papéis autorizados (`["admin", ...]`) ou faziam checagens
inline (`role !== "admin"`) sem incluir `superadmin`, fazendo o dono da
plataforma receber 403 em operações que deveria poder executar.

Há um limite de segurança deliberado: o `superadmin` **não pode criar outro
`superadmin`**. O papel só é atribuível fora do fluxo de API (provisionamento).

## Decision

1. **`superadmin` adicionado a toda rota onde `admin` é permitido**, mantendo o
   resto da lista de papéis inalterado:
   - `requireRole` / `requireAuth` / `requireEventAccess` passam a incluir
     `"superadmin"` nas listas (events, users, mediators, draw, registrations,
     participants, questions).
   - Checagens inline `role !== "admin"` em `users/route.ts`,
     `users/[id]/route.ts` e `mediators/[userId]/route.ts` foram trocadas por
     `requireRole(["admin", "superadmin"])` do `@/lib/api/auth-guard`.
   - Rotas `me/data` e `me/data-export` incluem `superadmin` na verificação de
     acesso; `me/assignments` trata `superadmin` como visão global, junto de
     `admin`.
   - `stripe/checkout` permite `superadmin`.
   - `requireEventAccess` já concedia acesso global a `admin`/`superadmin`
     (`auth-guard.ts`), comportamento confirmado.

2. **Bloqueio de escalonamento mantido.** `createUserSchema` e `patchUserSchema`
   (`src/lib/schemas.ts`) continuam com `z.enum(["admin", "mediador", "owner"])`
   — `superadmin` **não** é aceito via API. O tipo `UserRole` inclui
   `superadmin` apenas para leitura/segurança de tipos.

## Consequences

- O dono da plataforma deixa de receber 403 em operações administrativas e ganha
  acesso consistente com a semântica de superset.
- A superfície de privilégio do `superadmin` cresce; o controle de quem recebe o
  papel fica fora da API (provisionamento manual), reduzindo o risco de
  escalonamento via endpoint.
- Testes que afirmavam 403 para `superadmin` em rotas admin passam a esperar 200.
- **Status Proposed:** a decisão está implementada no código mas aguarda
  validação final do pipeline (review/security) antes de promoção a Accepted.
