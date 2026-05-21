# ADR-008: LGPD — Política de retenção do campo `author_ip`

**Status:** Accepted  
**Date:** 2026-05-21  
**Issue:** #39

## Context

Os campos `author_ip` nas tabelas `questions` e `registrations` são dados pessoais (PII) coletados exclusivamente para fins de rate limiting. A LGPD (Lei nº 13.709/2018) exige base legal e finalidade específica para o tratamento de dados pessoais.

## Decision

1. **Finalidade única**: `author_ip` é coletado apenas para aplicar rate limiting (max 10 perguntas/hora, max 5 inscrições/hora por IP). Não é compartilhado, analisado ou exibido ao usuário.
2. **Não exposição via API**: nenhuma rota pública ou autenticada retorna `author_ip`. O campo é omitido de todas as funções `mapQuestion` e `mapRegistration`.
3. **Comentário no schema**: o campo tem anotação `// PII — used for rate limiting only; never returned by public API` para orientar futuros desenvolvedores.
4. **Tipos públicos**: o tipo `Question` não inclui `authorIp`; o tipo `Registration` também não.

## Consequences

- Rate limiting continua funcionando corretamente via query `WHERE author_ip = $1`.
- Dados de IP não aparecem em exports, logs de aplicação ou respostas de API.
- Para conformidade plena, considerar política de retenção (ex: deletar `author_ip` após 30 dias) em ciclo futuro.
