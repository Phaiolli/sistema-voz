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
3. **`database.types.ts` é GERADO a partir do banco** via
   `supabase gen types typescript --linked` (script `npm run db:types`), não mais
   mantido à mão. O arquivo passa a ter o shape canônico do Supabase, incluindo
   `Relationships` (o que permite inferir joins embedded sem `as unknown as`). As
   colunas `jsonb` saem tipadas como `Json`; o narrowing para os tipos de domínio
   (`EventTheme`/`EventConfig`) é feito nos mappers (`src/lib/api/mappers.ts`),
   não no tipo gerado. Após qualquer migration aplicada ao banco, rode
   `npm run db:types` para regenerar — isso fecha o risco de drift entre o schema
   real e o tipo do client.
4. **Migrations**: continuam escritas à mão em `supabase/migrations/` (seguindo o
   padrão dos Lotes 1+, sempre idempotentes e com nota de rollback). O snapshot
   local do `drizzle-kit` (`drizzle/meta`) está defasado dessas migrations
   manuais, então **`drizzle-kit generate`/`db:generate` NÃO deve ser usado** até
   o snapshot ser reconciliado — o diff produzido seria incorreto/destrutivo.
   Optou-se por **não** rodar `drizzle-kit pull` agora: a introspecção
   sobrescreveria o histórico declarativo em `drizzle/` e poderia mascarar a
   divergência, dando uma falsa sensação de que `generate` voltou a ser seguro. A
   reconciliação do snapshot fica como trabalho futuro explícito.

## Consequences

**Positivo**
- Papéis claros: Drizzle modela; Supabase JS executa.
- Um único client (Supabase) para dados, Realtime e storage no servidor.
- `database.types.ts` dá segurança de tipo ao client, agora **gerado do banco**
  (`npm run db:types`) — elimina o drift manual entre schema e tipo do client.
- Com `Relationships` no tipo gerado, os joins embedded são inferidos pelo
  supabase-js; os `as unknown as` que descreviam o shape do join foram removidos
  (`me/assignments`, `events/[id]/mediators`).

**Negativo / custo**
- Regenerar `database.types.ts` depende da CLI `supabase` autenticada e do
  projeto linkado (rede/credenciais). Mitigação: rodar `npm run db:types` após
  cada migration; o arquivo gerado é versionado, então o CI continua sem precisar
  de rede.
- O snapshot do `drizzle-kit` (`drizzle/meta`) permanece defasado; até ser
  reconciliado, `db:generate` não deve ser usado e novas migrations seguem
  manuais. A reconciliação (via `drizzle-kit pull` controlado ou regeneração do
  histórico) fica pendente como trabalho futuro.

## Alternatives Considered

- **Adotar o Drizzle também no runtime** (substituir o client Supabase nas
  queries): elimina a dualidade de tipos, mas duplica a camada de conexão
  (Supabase já é necessário para Realtime/storage) e aumenta o risco de
  comportamento divergente em serverless. Descartado.
- **Remover o Drizzle e usar só `supabase gen types`**: tornaria o Supabase a
  fonte do schema, mas hoje não há rede/credenciais no CI para gerar tipos, e o
  histórico de migrations declarativas do Drizzle (`drizzle/`) seria perdido.
  Descartado por ora; reavaliável quando houver geração de tipos no CI.
