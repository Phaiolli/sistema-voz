# ADR-011: Rate limiting com store plugável para auth (register/login)

**Status:** Accepted  
**Date:** 2026-06-25  
**Updated:** 2026-06-26 (store distribuído opcional via Upstash)  
**Issue:** audit 2026-06-25 (H3); follow-up de segurança FU2

## Context

As rotas de autenticação (`POST /api/auth/register` e o `authorize` do provider
Credentials em `src/lib/auth.ts`) não tinham rate limiting, abrindo espaço para
brute force de senha e abuso de criação de contas. As rotas de perguntas e
inscrições já usam um limitador baseado em banco (contagem por `author_ip` na
tabela), mas auth não tem tabela equivalente nem deve gravar tentativas.

## Decision

Implementar um limitador **sliding-window com store plugável**
(`src/lib/api/rate-limit.ts`). A interface pública permanece
`rateLimit(key, { max, windowMs })`, agora **assíncrona** (necessário para o
backend distribuído via `fetch`); os callers (`register`, `login`) aguardam com
`await`. O store é selecionado uma vez por processo:

- **In-memory (default):** `Map<string, number[]>` com limpeza preguiçosa das
  timestamps fora da janela. Zero-dependência, por processo.
- **Upstash Redis (REST), opcional:** ativado automaticamente quando
  `UPSTASH_REDIS_REST_URL` **e** `UPSTASH_REDIS_REST_TOKEN` estão definidas.
  Sliding window via sorted set (`ZREMRANGEBYSCORE` + `ZADD` + `ZCARD` +
  `PEXPIRE`) usando a API REST por `fetch` — **sem dependência npm**. Estado
  compartilhado entre instâncias serverless e resiliente a reinícios.

Sem as env vars o comportamento é **idêntico** ao in-memory original. Se o store
distribuído falhar (rede/Upstash fora), o limitador faz **fallback para um
limitador in-memory por instância** (proteção parcial contra brute force)
em vez de fail-open total — a função nunca lança, preservando a disponibilidade
do auth, mas a proteção degrada graciosamente em vez de desaparecer.

- `register`: máx. 5 tentativas/hora por IP → `429` com header `Retry-After`.
- `login` (`authorize`): máx. 5 tentativas/15 min por e-mail → retorna `null`
  (não vaza o motivo; indistinguível de credencial errada).

## Consequences

- **Map por instância (não compartilhado) — modo default:** sem Upstash, o
  estado é por processo e **não** é compartilhado entre instâncias serverless;
  reinícios zeram a contagem. Em deploy single-instance é eficaz; ao escalar
  horizontalmente, a proteção fica proporcional ao número de instâncias. O Map
  descarta chaves cuja janela expirou totalmente, evitando crescimento
  ilimitado. **Mitigação disponível:** definir as env vars Upstash para um store
  compartilhado entre instâncias sem mudança de código.
- **Premissa de proxy confiável:** a chave por IP do `register` deriva de
  `x-forwarded-for`. Atrás do edge da Vercel esse header é confiável; sem um
  proxy confiável à frente, ele é spoofável e o limite por IP pode ser burlado.
- **TOCTOU no limitador por banco (camada 1):** o rate limiting de
  perguntas/inscrições (`questions`/`registrations` POST) conta linhas recentes
  no banco antes de inserir — há race condition TOCTOU sob concorrência alta
  (evento ao vivo), permitindo estouro momentâneo do limite. **Limitação
  ACEITA** como primeira camada de proteção; a mitigação real é rate limiting
  no WAF/edge.
- **Decisão de privacidade relacionada:** em perguntas não anônimas o
  `author_name` é público por design (aparece no telão do Q&A ao vivo); e-mail,
  contato e IP nunca são expostos. Ver `src/lib/api/question-mappers.ts`.
- **Store distribuído já implementado (FU2):** o caminho de evolução para store
  compartilhado (Upstash via REST) está disponível e é ativado por env vars; não
  requer novo deploy de código, só configuração. Rate limiting na borda
  (proxy/WAF) continua sendo a defesa complementar recomendada sob alta
  concorrência.
