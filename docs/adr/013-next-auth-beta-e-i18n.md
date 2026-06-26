# ADR-013: next-auth 5 (beta) fixado e produto PT-BR único (sem i18n)

**Status:** Accepted  
**Date:** 2026-06-26  
**Issue:** audit 2026-06-25 (Lote 7 — decisões técnicas pendentes)

## Context

O audit levantou dois pontos que não eram falhas, mas decisões técnicas não
registradas:

1. **`next-auth@5.0.0-beta.31` em produção.** A linha 5.x (Auth.js) é a única com
   suporte de primeira classe ao App Router do Next.js 16 e ao fluxo de
   `Credentials` + callbacks `jwt`/`session` que o projeto usa. A 4.x não suporta
   o App Router da forma necessária. A 5.x ainda está em beta no momento.
2. **Strings de UI hardcoded em PT-BR**, sem framework de i18n. O audit sinalizou
   como observação (não bloqueante).

## Decision

1. **Manter `next-auth` na 5.x e FIXAR a versão exata** (`5.0.0-beta.31`, sem
   `^`), para evitar que um beta novo quebre auth silenciosamente. Atualizações
   são feitas de forma deliberada, com a suíte de testes de `auth`/`auth-guard`
   como rede de segurança, e reavaliadas quando a 5.x sair de beta (migrar para a
   estável assim que disponível).
2. **O produto é PT-BR único por decisão**; não adotar framework de i18n agora.
   Strings em português no código são aceitas. Caso surja necessidade real de
   outro idioma, reabrir esta decisão e introduzir i18n then (não
   especulativamente — princípio de simplicidade primeiro).

## Consequences

**Positivo**
- Sem surpresa de upgrade de beta (versão fixada).
- Sem complexidade de i18n sem demanda real.

**Negativo / custo**
- Dependência de um beta em produção: risco de bug/segurança até a estável.
  Mitigação: versão fixada + testes de autenticação + acompanhar releases.
- Internacionalizar no futuro exigirá extrair as strings hardcoded — custo
  assumido conscientemente.

## Alternatives Considered

- **Voltar para next-auth 4.x**: não suporta o App Router como o projeto precisa.
  Descartado.
- **Introduzir i18n (next-intl/i18next) já**: abstração prematura sem demanda de
  segundo idioma. Descartado por ora.
