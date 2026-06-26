# ADR-012: Drizzle como fonte do schema, Supabase JS no runtime

**Status:** Accepted  
**Date:** 2026-06-26  
**Issue:** audit 2026-06-25 (Lote 4 — Arquitetura)  
**Supersedes (parcial):** ADR-001 (ajusta o papel do Drizzle em runtime)

## Context

O ADR-001 adotou **Supabase** (PostgreSQL gerenciado + Realtime) e **Drizzle
ORM** para acesso ao banco. Na prática, o código evoluiu para um modelo híbrido:

- O **schema** e as **migrations** são definidos em Drizzle
  (`src/lib/db/schema.ts` + `drizzle-kit`).
- O **acesso a dados em runtime** é feito com `@supabase/supabase-js`
  (`createServerClient` com a service-role key), não com o query builder do
  Drizzle. Isso porque o mesmo client já é usado para Realtime (broadcast) e
  para storage, evitando duas camadas de conexão/serialização no serverless.

Essa dualidade não estava documentada e gerava dois riscos: (a) confusão sobre
qual ferramenta é a fonte de verdade do schema; (b) divergência silenciosa entre
o schema Drizzle e o tipo `Database` (`src/lib/db/database.types.ts`) que tipa o
client Supabase. O audit (Lote 3) introduziu `database.types.ts` escrito à mão
justamente para tipar `createClient<Database>()`.

Além disso, o snapshot local do `drizzle-kit` ficou dessincronizado do banco
implantado: várias migrations recentes (RLS, storage, multitenancy) foram
escritas à mão em `supabase/migrations/`, então `drizzle-kit generate` passou a
produzir diffs incorretos/destrutivos.

## Decision

1. **Drizzle é a fonte de verdade do schema** (`schema.ts`). Mudanças de modelo
   de dados começam ali.
2. **O acesso a dados em runtime é via `@supabase/supabase-js`**, tipado com o
   tipo `Database` de `database.types.ts`. O query builder do Drizzle **não** é
   usado em runtime.
3. **`database.types.ts` deve ser mantido em sincronia com `schema.ts`**
   (manualmente por ora; idealmente gerado por `supabase gen types` quando
   houver credenciais/CI). Toda alteração de coluna/enum em `schema.ts` exige a
   atualização correspondente em `database.types.ts`.
4. **Migrations**: quando o snapshot do `drizzle-kit` estiver em sincronia,
   `drizzle-kit generate` pode ser usado; quando não estiver (caso atual), a
   migration é escrita à mão em `supabase/migrations/` seguindo o padrão dos
   Lotes 1+, sempre idempotente e com nota de rollback.

## Consequences

**Positivo**
- Papéis claros: Drizzle modela; Supabase JS executa.
- Um único client (Supabase) para dados, Realtime e storage no servidor.
- `database.types.ts` dá segurança de tipo ao client sem depender de rede no CI.

**Negativo / custo**
- `schema.ts` e `database.types.ts` podem divergir se a sincronização manual for
  esquecida. Mitigação: checklist no PR e, no futuro, geração automática.
- O snapshot do `drizzle-kit` está defasado; até ser reconciliado, novas
  migrations seguem manuais (não confiar cegamente no `generate`).

## Alternatives Considered

- **Adotar o Drizzle também no runtime** (substituir o client Supabase nas
  queries): elimina a dualidade de tipos, mas duplica a camada de conexão
  (Supabase já é necessário para Realtime/storage) e aumenta o risco de
  comportamento divergente em serverless. Descartado.
- **Remover o Drizzle e usar só `supabase gen types`**: tornaria o Supabase a
  fonte do schema, mas hoje não há rede/credenciais no CI para gerar tipos, e o
  histórico de migrations declarativas do Drizzle (`drizzle/`) seria perdido.
  Descartado por ora; reavaliável quando houver geração de tipos no CI.
