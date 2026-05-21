# ADR 003 — UI: shadcn/ui Design System

**Status:** Accepted
**Date:** 2025-05-21

## Context

Precisamos de componentes UI acessíveis, customizáveis com Tailwind, compatíveis com React 19 e sem bundle overhead de bibliotecas de componentes completas.

## Decision

Usar **shadcn/ui** com **Base UI** como primitivos headless, **Tailwind v4** para estilização e **CVA** (class-variance-authority) para variantes.

- shadcn/ui gera componentes copiados para o repositório (sem dependência de runtime)
- Base UI fornece primitivos acessíveis (Radix UI replacement)
- Tailwind v4 com CSS variables para theming por evento
- Lucide React para ícones
- Sonner para notificações toast

## Consequences

**Positivo:**
- Componentes no repositório = controle total, sem breaking changes de atualizações
- Acessibilidade (ARIA) gerenciada pelos primitivos Base UI
- Tailwind v4 CSS variables permitem temas por evento sem JS
- Bundle mínimo — apenas componentes usados são incluídos

**Negativo:**
- Atualizações de componentes precisam ser feitas manualmente (`pnpm dlx shadcn@latest add`)
- Tailwind v4 ainda recente — documentação e ecossistema menos maduro que v3
- Mais arquivos no repositório (cada componente é um arquivo)

## Alternatives Considered

- **Chakra UI:** Runtime JS overhead e menos controle sobre estilo
- **Mantine:** Excelente mas opinionated; conflito com Tailwind
- **Headless UI (Tailwind Labs):** Boa opção mas Base UI tem API mais moderna
