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

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Supabase pooler URL (porta 6543, transaction mode) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima pública do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de service role (somente servidor) |
| `AUTH_SECRET` | Secret para assinar JWT do NextAuth (`openssl rand -base64 32`) |
| `SEED_SECRET` | Secret para proteger o endpoint `/api/seed` |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação |

## Rotas

### Públicas (participantes)

| Rota | Descrição |
|------|-----------|
| `/e/[slug]` | Página do evento (agenda, palestrantes) |
| `/e/[slug]/perguntar` | Formulário de submissão de perguntas |
| `/e/[slug]/obrigado` | Confirmação de envio |
| `POST /api/v1/events/[eventId]/questions` | Enviar pergunta (máx. 10/hora por IP) |
| `GET /api/v1/events/[eventId]/questions` | Listar perguntas do evento |

### Autenticadas (mediadores e admins)

| Rota | Descrição |
|------|-----------|
| `/entrar` | Login |
| `/mediador` | Dashboard com perguntas em tempo real |
| `/mediador/apresentar` | Modo apresentação (tela cheia) |
| `PATCH /api/v1/questions/[id]` | Moderar pergunta (mediador/admin) |

### Admin

| Rota | Descrição |
|------|-----------|
| `/admin/eventos` | Gerenciar eventos |
| `/admin/usuarios` | Gerenciar usuários e permissões |

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

## Desenvolvimento

Este projeto usa o sistema **Octechpus** de orquestração de agentes IA. Toda mudança de código passa pelo pipeline completo de agentes: Architect → Coder → Reviewer → QA → Security → Docs.

Consulte [CLAUDE.md](./CLAUDE.md) para as regras do pipeline.
