# ADR-004 — Dark mode padrão para /admin e /mediador

**Status:** Aceito  
**Data:** 2026-05-21  
**Autores:** Pipeline Octechpus

## Contexto

Os ambientes `/admin` e `/mediador` são operados em contextos de baixa luminosidade (palco, auditório). O modo claro padrão causa desconforto visual. Os operadores precisam de dark mode como padrão, mas com opção de alternar.

## Decisão

Implementar um `AdminThemeProvider` customizado (Client Component) que:

1. Aplica a classe `.dark` a um wrapper `<div>` (não ao `<html>`) — preservando isolamento entre rotas internas e públicas.
2. Persiste a preferência em `localStorage` com chave `theme-admin`.
3. Usa `defaultTheme="dark"`.
4. Expõe um `ThemeToggle` (ícone Sun/Moon) no canto superior direito dos layouts.

### Por que wrapper div, não `<html>`

`next-themes` por padrão modifica `document.documentElement`. Com App Router e client-side navigation, a classe `.dark` no `<html>` persistiria ao navegar para rotas públicas. O wrapper div isola o escopo.

O CSS do projeto usa `@custom-variant dark (&:is(.dark *))` — a classe `.dark` em qualquer ancestral funciona corretamente.

## Alternativas rejeitadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| `ThemeProvider` global no root layout | Afetaria rotas públicas |
| `prefers-color-scheme` media query | Sem controle de toggle manual |
| Zustand / Context manual complexo | Dependência desnecessária — useState é suficiente |
| `next-themes` com target customizado | API instável, wrapper div é mais simples |

## Consequências

- `Toaster` movido do root layout para cada sub-layout (admin/mediador), garantindo que o tema do toast siga o modo visual correto.
- Rotas públicas (`/e/[slug]`, `/entrar`) são completamente isoladas.
- Flash mínimo de hidratação mitigado com `suppressHydrationWarning` no wrapper div.
