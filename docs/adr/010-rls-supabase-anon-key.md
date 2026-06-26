# ADR-010: RLS no Supabase com anon key exposta no browser

**Status:** Accepted  
**Date:** 2026-06-25  
**Issue:** audit 2026-06-25 (C4)

## Context

A `NEXT_PUBLIC_SUPABASE_ANON_KEY` é embarcada no bundle do browser (necessária
para os canais Realtime). Sem Row Level Security (RLS) habilitada, qualquer
pessoa de posse dessa chave pode ler e escrever diretamente nas tabelas via
PostgREST — incluindo PII em `questions`, `registrations`, `users` e
`event_payments`. Esse é o bloqueador de segurança crítico C4.

Levantamento do uso do client do browser (`createBrowserClient`) confirmou que
o front-end **não** faz `.from(...).select()` direto: usa apenas
`channel(...).subscribe()` (Realtime) e chama as rotas internas `/api/v1/*`.
Todo acesso a dados no servidor passa pela service-role key
(`createServerClient`), que faz bypass de RLS.

## Decision

1. **Habilitar RLS** em `users`, `events`, `questions`, `registrations`,
   `participants`, `event_payments` e `mediator_assignments`
   (migration `20260625000002_enable_rls.sql`).
2. **Nenhuma policy permissiva** para `anon`/`authenticated`. Com RLS ligada e
   sem policy, a anon key fica sem acesso a linhas — fechando a exposição.
3. **Service-role obrigatória no servidor**: removido o fallback
   `?? anonKey` em `createServerClient`; ausência de
   `SUPABASE_SERVICE_ROLE_KEY` agora lança erro explícito (sem a chave, RLS
   quebraria silenciosamente o servidor).
4. Realtime (broadcast) não depende de leitura de tabela, então continua
   funcionando com a anon key.

## Consequences

- A anon key exposta deixa de dar acesso a dados.
- Caso o front-end passe a precisar de leitura direta de alguma tabela
  (ex.: `events` público), será necessário adicionar uma policy específica
  `SELECT USING (...)` restrita ao mínimo — hoje não há essa necessidade.
- Operação do servidor exige `SUPABASE_SERVICE_ROLE_KEY` configurada; deploys
  sem ela falham de forma explícita em vez de degradar para anon.
