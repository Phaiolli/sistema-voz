# ADR-011: Rate limiting in-memory para auth (register/login)

**Status:** Accepted  
**Date:** 2026-06-25  
**Issue:** audit 2026-06-25 (H3)

## Context

As rotas de autenticação (`POST /api/auth/register` e o `authorize` do provider
Credentials em `src/lib/auth.ts`) não tinham rate limiting, abrindo espaço para
brute force de senha e abuso de criação de contas. As rotas de perguntas e
inscrições já usam um limitador baseado em banco (contagem por `author_ip` na
tabela), mas auth não tem tabela equivalente nem deve gravar tentativas.

## Decision

Implementar um limitador **sliding-window in-memory, zero-dependência**
(`src/lib/api/rate-limit.ts`): `Map<string, number[]>` com limpeza preguiçosa
das timestamps fora da janela.

- `register`: máx. 5 tentativas/hora por IP → `429` com header `Retry-After`.
- `login` (`authorize`): máx. 5 tentativas/15 min por e-mail → retorna `null`
  (não vaza o motivo; indistinguível de credencial errada).

## Consequences

- **Map por instância (não compartilhado):** o estado é por processo e **não**
  é compartilhado entre instâncias serverless; reinícios zeram a contagem. Em
  deploy single-instance é eficaz; ao escalar horizontalmente, a proteção fica
  proporcional ao número de instâncias. O Map agora descarta chaves cuja janela
  expirou totalmente, evitando crescimento ilimitado.
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
- **Caminho de evolução:** migrar para store compartilhado (Redis/Upstash) ou
  rate limiting na borda (middleware/WAF) quando houver mais de uma instância.
  A abordagem in-memory é o mínimo viável aceito para fechar o bloqueador H3,
  sujeita a revisão na fase de arquitetura.
