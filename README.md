# voz.

Sistema de perguntas e respostas ao vivo para eventos. Permite que participantes enviem perguntas em tempo real, mediadores selecionem e apresentem perguntas na tela, e administradores gerenciem eventos e usuários.

Desenvolvido para a 1ª Conferência INCLUIR 2025.

## Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19 + Tailwind v4 + shadcn/ui
- **Banco de dados:** PostgreSQL via Supabase + Drizzle ORM
- **Realtime:** Supabase Realtime (WebSocket broadcast)
- **Autenticação:** NextAuth v5 (JWT + Credentials)
- **Deploy:** Vercel (região São Paulo — gru1)
- **Testes:** Vitest + @testing-library/react

## Pré-requisitos

- Node.js ≥ 18
- pnpm 10+
- Projeto Supabase criado ([supabase.com](https://supabase.com))

## Setup local

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com os valores do seu projeto Supabase

# 3. Executar migrations do banco de dados
pnpm db:push

# 4. Criar evento e admin inicial
curl -X POST http://localhost:3000/api/seed \
  -H "x-seed-secret: SEU_SEED_SECRET"

# 5. Iniciar o servidor de desenvolvimento
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Variáveis de Ambiente

### Obrigatórias

| Variável | Descrição | Escopo |
|----------|-----------|--------|
| `DATABASE_URL` | Supabase pooler URL (porta 6543, transaction mode) | Server |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima pública do Supabase | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de service role (obrigatória para RLS) | Server |
| `AUTH_SECRET` | Secret para assinar JWT do NextAuth (`openssl rand -base64 32`) | Server |

### Opcionais (Dev/Testing)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `SEED_SECRET` | Secret para proteger `/api/seed` | (desabilitado se não definido) |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação | `http://localhost:3000` |

### Rate limiting distribuído (Upstash)

O rate limiting de autenticação (`register`/`login`) usa um store in-memory por
padrão. Definindo **ambas** as variáveis abaixo, ele passa a usar um store
compartilhado via Upstash Redis (REST), eficaz em deploy com múltiplas
instâncias. Sem elas, o comportamento é idêntico ao in-memory. Ver ADR 011.

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `UPSTASH_REDIS_REST_URL` | URL REST do banco Upstash Redis | (in-memory se ausente) |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST do banco Upstash Redis | (in-memory se ausente) |

### Stripe (Pagamentos)

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe (`sk_live_...` ou `sk_test_...`) | Sim (produção) |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook Stripe (`whsec_...`) | Sim (produção) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chave publicável do Stripe (`pk_live_...` ou `pk_test_...`) | Sim (produção) |

### LGPD/Cleanup

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `CRON_SECRET` | Secret para proteger `/api/v1/internal/cleanup` | Sim (produção) |

## Setup Stripe

1. **Criar produto no Stripe Dashboard**
   - Acesse [dashboard.stripe.com/products](https://dashboard.stripe.com/products) e crie um produto "voz. — Evento pago" com preço único de R$ 59,90.

2. **Copiar as chaves para `.env.local`**
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_APP_URL=https://seudominio.com
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

3. **Configurar o webhook**
   - No Stripe Dashboard → Developers → Webhooks → Add endpoint.
   - URL: `https://seudominio.com/api/webhooks/stripe`
   - Evento: `checkout.session.completed`

4. **Copiar o Signing Secret**
   - Após criar o webhook, copie o valor de **Signing secret** (`whsec_...`) para `STRIPE_WEBHOOK_SECRET` no `.env.local`.

## Rotas

### Autenticação

| Rota | Método | Descrição | Auth |
|------|--------|-----------|------|
| `/api/auth/register` | POST | Registra novo owner | Público |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth routes (login, callback) | Público |

### Eventos (CRUD)

| Rota | Método | Descrição | Auth |
|------|--------|-----------|------|
| `/api/v1/events` | GET | Lista eventos do owner/admin | Sessão |
| `/api/v1/events` | POST | Cria novo evento | Owner/Admin |
| `/api/v1/events/[id]` | GET | Obtém detalhes do evento | Owner/Admin |
| `/api/v1/events/[id]` | PATCH | Atualiza evento | Owner/Admin |
| `/api/v1/events/[id]` | DELETE | Deleta evento | Owner/Admin |

### Perguntas (Q&A)

| Rota | Método | Descrição | Auth | Escopo |
|------|--------|-----------|------|--------|
| `/api/v1/events/[eventId]/questions` | POST | Envia pergunta | Público/Sessão | Rate limit: 10/hora por IP |
| `/api/v1/events/[eventId]/questions` | GET | Lista perguntas (projeção pública sem PII) | Público | Retorna apenas `id, eventId, text, isAnonymous, authorName, status, createdAt` |
| `/api/v1/questions/[id]` | PATCH | Modera pergunta (setNext, markAnswered, hide, restore) | Mediador/Admin | Escopo: evento |
| `/api/v1/questions/[id]` | DELETE | Deleta pergunta | Mediador/Admin | Escopo: evento |

### Inscrições

| Rota | Método | Descrição | Auth | Escopo |
|------|--------|-----------|------|--------|
| `/api/v1/events/[id]/registrations` | POST | Inscreve participante | Público | Rate limit por IP |
| `/api/v1/events/[id]/registrations` | GET | Lista inscrições | Owner/Admin | Escopo: evento |
| `/api/v1/events/[id]/registrations/[regId]` | PATCH | Atualiza check-in/kit | Owner/Admin | Escopo: evento |
| `/api/v1/events/[id]/registrations/[regId]` | DELETE | Remove inscrição (anonimiza) | Público/Sessão | Direito ao esquecimento LGPD |

### Participantes (Credenciamento)

| Rota | Método | Descrição | Auth | Escopo |
|------|--------|-----------|------|--------|
| `/api/v1/events/[eventId]/participants` | GET | Lista participantes (autores) | Mediador/Admin | Escopo: evento |

### Sorteio

| Rota | Método | Descrição | Auth | Escopo |
|------|--------|-----------|------|--------|
| `/api/v1/events/[id]/draw` | POST | Executa sorteio | Owner/Admin | Escopo: evento |

### Mediadores

| Rota | Método | Descrição | Auth | Escopo |
|------|--------|-----------|------|--------|
| `/api/v1/events/[id]/mediators` | GET | Lista mediadores atribuídos | Owner/Admin | Escopo: evento |
| `/api/v1/events/[id]/mediators` | POST | Atribui mediador | Owner/Admin | Escopo: evento |
| `/api/v1/events/[id]/mediators/[userId]` | DELETE | Remove mediador | Owner/Admin | Escopo: evento |

### Perfil do Usuário

| Rota | Método | Descrição | Auth | Notas |
|------|--------|-----------|------|-------|
| `/api/v1/me/profile` | GET | Obtém perfil | Sessão | |
| `/api/v1/me/profile` | PATCH | Atualiza perfil | Sessão | |
| `/api/v1/me/plan` | GET | Obtém plano e histórico de pagamentos | Sessão | |
| `/api/v1/me/assignments` | GET | Lista eventos atribuídos (mediador) | Sessão | |
| `/api/v1/me/data` | GET | Exporta PII (direito de acesso LGPD) | Sessão | |
| `/api/v1/me/data` | DELETE | Anonimiza dados (direito ao esquecimento) | Sessão | |
| `/api/v1/me/data-export` | GET | Download portável de dados | Sessão | JSON/arquivo |

### Plataforma (Admin/Superadmin)

| Rota | Método | Descrição | Auth |
|------|--------|-----------|------|
| `/api/v1/plataforma/stats` | GET | Estatísticas gerais | Admin/Superadmin |
| `/api/v1/plataforma/users` | GET | Lista usuários | Admin/Superadmin |
| `/api/v1/plataforma/payments` | GET | Lista pagamentos | Admin/Superadmin |

### Upload

| Rota | Método | Descrição | Auth | Validações |
|------|--------|-----------|------|-----------|
| `/api/v1/upload` | POST | Upload de arquivo (imagem) | Sessão | Tipos: JPEG, PNG, WebP (SVG rejeitado) |

### Pagamento (Stripe)

| Rota | Método | Descrição | Auth |
|------|--------|-----------|------|
| `/api/v1/stripe/checkout` | POST | Cria sessão Stripe Checkout | Sessão |
| `/api/webhooks/stripe` | POST | Webhook Stripe (checkout.session.completed) | STRIPE_WEBHOOK_SECRET |

### Páginas Web

| Rota | Descrição |
|------|-----------|
| `/` | Home |
| `/cadastro` | Registro de novo owner |
| `/entrar` | Login |
| `/dashboard` | Dashboard do owner (eventos, plano) |
| `/dashboard/conta` | Perfil e privacidade |
| `/e/[slug]` | Página pública do evento |
| `/e/[slug]/perguntar` | Formulário de submissão de perguntas |
| `/e/[slug]/obrigado` | Confirmação de envio |
| `/admin/eventos` | Gerenciar eventos (admin) |
| `/admin/usuarios` | Gerenciar usuários (admin) |
| `/mediador` | Dashboard mediador (Q&A em tempo real) |
| `/mediador/apresentar` | Modo apresentação (tela cheia) |
| `/conta` | Minha conta (owner/mediador) |
| `/pagamento/sucesso` | Confirmação pós-pagamento |
| `/pagamento/cancelado` | Cancelamento de pagamento |

### Internas (Cron)

| Rota | Método | Descrição | Auth |
|------|--------|-----------|------|
| `/api/v1/internal/cleanup` | GET | Limpeza LGPD (cron diário) | CRON_SECRET |
| `/api/v1/internal/cleanup` | DELETE | Limpeza LGPD (manual) | CRON_SECRET |

### Seed (Dev)

| Rota | Método | Descrição | Auth |
|------|--------|-----------|------|
| `/api/seed` | POST | Cria evento e admin inicial | SEED_SECRET |

## Comandos

```bash
pnpm dev              # Servidor de desenvolvimento
pnpm build            # Build de produção
pnpm test             # Executar testes
pnpm test:coverage    # Testes com relatório de cobertura
pnpm typecheck        # Verificar tipos TypeScript
pnpm lint             # Lint do código

pnpm db:generate      # Gerar migrations Drizzle
pnpm db:migrate       # Executar migrations
pnpm db:push          # Push do schema (dev)
pnpm db:studio        # Abrir Drizzle Studio
```

## Arquitetura

```
src/
├── app/
│   ├── admin/          # Painel admin (eventos, usuários)
│   ├── api/            # API routes (NextAuth, seed, v1/*)
│   ├── e/[slug]/       # Páginas públicas do evento
│   ├── entrar/         # Página de login
│   └── mediador/       # Dashboard e modo apresentação
├── components/
│   ├── ui/             # Componentes shadcn/ui
│   └── voz/            # Componentes específicos do projeto
└── lib/
    ├── auth.ts         # Configuração NextAuth
    ├── db/             # Schema e client Drizzle
    ├── schemas.ts      # Schemas de validação Zod
    ├── supabase.ts     # Clients Supabase (browser + server)
    └── types.ts        # Tipos TypeScript
```

## Papéis de usuário

| Papel | Permissões |
|-------|-----------|
| `admin` | Acesso total — gerencia eventos, usuários e modera perguntas |
| `mediador` | Seleciona, apresenta e modera perguntas de eventos atribuídos |
| `owner` | Organizer SaaS — cria e gerencia seus próprios eventos; sujeito a limites de plano |

## Desenvolvimento

Este projeto usa o sistema **Octechpus** de orquestração de agentes IA. Toda mudança de código passa pelo pipeline completo de agentes: Architect → Coder → Reviewer → QA → Security → Docs.

Consulte [CLAUDE.md](./CLAUDE.md) para as regras do pipeline.
