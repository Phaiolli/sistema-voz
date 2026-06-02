# ADR 009 — SaaS Multi-Tenant com Stripe e LGPD

**Status:** Accepted  
**Date:** 2026-05-25  
**Issue:** [#47](https://github.com/Phaiolli/sistema-voz/issues/47)  
**Impact:** HIGH — mudança arquitetural de single-tenant para multi-tenant SaaS

---

## Contexto

O voz. foi construído como uma solução single-tenant para a 1ª Conferência INCLUIR 2025. O objetivo agora é transformá-lo num produto SaaS onde qualquer organização pode criar sua conta, criar eventos e usar a plataforma de perguntas ao vivo.

**Modelo de negócio:**
- Cadastro gratuito (sem cartão)
- Plano free: 1 evento, máx. 15 perguntas por evento
- Evento adicional: R$ 59,90 one-time por evento via Stripe
- Sem limite de perguntas em eventos pagos

---

## Decisão

### 1. Modelo de Conta: User com role `owner`

Adicionar o role `owner` ao enum existente (ao lado de `admin` e `mediador`). Um `owner` é o organizador da conta — cria eventos, gerencia mediadores, visualiza relatórios.

**Por quê não criar tabela `organizations` separada?** O MVP não exige contas compartilhadas por múltiplos admins — o owner é a conta. Uma tabela de organizações pode ser adicionada em ADR futuro quando houver demanda para equipes.

### 2. Plano no Usuário: coluna `plan` + `eventCount`

Adicionar a `users`:
- `plan: text` — `free` | `paid` (default `free`)
- Contagem de eventos derivada via query (não coluna redundante)

### 3. Pagamento por Evento: tabela `event_payments`

Nova tabela que rastreia o Stripe Checkout Session de cada evento pago. Status: `pending` | `paid` | `refunded`.

A criação do evento é **separada do pagamento**:
1. Owner chama `POST /api/v1/events` → se acima do limite free, retorna `402` com `checkoutUrl`
2. Stripe Checkout Session é criada com metadata `{ eventData: <json> }`
3. Após pagamento: webhook cria o evento e registra o pagamento

**Por quê não criar o evento antes do pagamento?** Evita estados inconsistentes (evento sem pagamento). O evento só existe após confirmação do Stripe.

### 4. Limite de Perguntas: verificação em runtime na API

`POST /api/v1/events/:eventId/questions` verifica:
1. Busca o evento e seu `organizer_id`
2. Busca o plano do owner (`users.plan`)
3. Se `free` e `count(questions where event_id = ?) >= 15` → retorna 403

Não há coluna `question_limit` no schema — a regra vive na API. Isso facilita mudar o limite sem migration.

### 5. Autenticação: registro público via `POST /api/auth/register`

Novo endpoint (sem NextAuth — chamado antes do login) que:
1. Valida email + senha com zod
2. Hash da senha com bcrypt (rounds: 12)
3. Insere user com role `owner`, plan `free`
4. Retorna 201 (sem auto-login — user faz login manualmente)

### 6. Multi-tenancy: escopo por `organizer_id`

Todos os endpoints de eventos (`GET`, `POST`, `PATCH`, `DELETE`) passam a filtrar por `organizer_id = session.user.id` quando o role for `owner`. O `admin` da plataforma continua vendo tudo.

### 7. LGPD: portabilidade e esquecimento

Novos endpoints:
- `GET /api/v1/me/data-export` — retorna JSON com todos os dados PII do organizer e seus eventos
- `DELETE /api/v1/me/data` — anonimiza PII de participantes (troca por UUID) e remove dados do owner

Dados retidos após deleção do owner: eventos anonimizados (sem PII), por obrigação de registro fiscal (dados do pagamento Stripe = 5 anos).

---

## Fases de Implementação

### Fase 1 — Schema e Auth (fundação)
1. Migration: adicionar role `owner` ao enum `user_role`
2. Migration: adicionar `plan text default 'free'` em `users`
3. Migration: criar tabela `event_payments`
4. `POST /api/auth/register` — endpoint público de registro
5. Atualizar `requireAdmin` → `requireOwnerOrAdmin` helper
6. Página `/cadastro` com form de registro

### Fase 2 — Multi-tenancy
1. `GET /api/v1/events` filtra por `organizer_id` para owners
2. `POST /api/v1/events` verifica limite do plano free
3. `GET|PATCH|DELETE /api/v1/events/:id` verifica ownership
4. Página `/dashboard` para owners (lista de eventos próprios)
5. Redirect pós-login: owners → `/dashboard`, admins → `/admin/eventos`

### Fase 3 — Stripe
1. Instalar `stripe` package
2. `POST /api/v1/stripe/checkout` — cria Stripe Checkout Session
3. `POST /api/webhooks/stripe` — processa `checkout.session.completed`
4. Página `/dashboard/novo-evento` com paywall visual
5. Página `/pagamento/sucesso` e `/pagamento/cancelado`

### Fase 4 — LGPD
1. `GET /api/v1/me/data-export`
2. `DELETE /api/v1/me/data`
3. Página `/dashboard/conta` com seção de dados e privacidade
4. Política de Privacidade atualizada (texto legal)
5. Retenção automática: job que anonimiza PII de participantes 90 dias pós-evento

---

## Schema Changes (Drizzle)

```typescript
// users — adicionar:
plan: text("plan").notNull().default("free"), // "free" | "paid"

// userRoleEnum — adicionar valor:
export const userRoleEnum = pgEnum("user_role", ["admin", "mediador", "owner"]);

// Nova tabela:
export const eventPayments = pgTable("event_payments", {
  id: text("id").primaryKey(),
  eventId: text("event_id"), // null até o evento ser criado
  ownerId: text("owner_id").notNull().references(() => users.id),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: integer("amount").notNull(), // centavos: 5990
  currency: text("currency").notNull().default("brl"),
  status: text("status").notNull().default("pending"), // "pending"|"paid"|"refunded"
  eventData: jsonb("event_data"), // dados do evento a ser criado (JSON temporário)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});
```

---

## Novos Endpoints

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/auth/register` | — | Registro público de owner |
| GET | `/api/v1/account` | owner | Dados da conta (plano, eventos) |
| POST | `/api/v1/stripe/checkout` | owner | Cria Stripe Checkout Session |
| POST | `/api/webhooks/stripe` | Stripe sig | Processa pagamento confirmado |
| GET | `/api/v1/me/data-export` | owner | Exportação LGPD |
| DELETE | `/api/v1/me/data` | owner | Direito ao esquecimento LGPD |

---

## Novas Páginas

| Rota | Descrição |
|------|-----------|
| `/cadastro` | Registro público (form email + senha + nome + LGPD consent) |
| `/dashboard` | Painel do owner — lista de eventos próprios |
| `/dashboard/novo-evento` | Criação de evento (com paywall se free+já tem 1 evento) |
| `/dashboard/conta` | Configurações da conta, zona de privacidade LGPD |
| `/pagamento/sucesso` | Confirmação pós-Stripe |
| `/pagamento/cancelado` | Cancelamento pós-Stripe |

---

## Variáveis de Ambiente Novas

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_EVENT=5990        # centavos
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Owner cria evento free, não paga, tenta o webhook manualmente | Verificar assinatura Stripe (`stripe.webhooks.constructEvent`) — obrigatório |
| Race condition: dois checkouts para o mesmo evento | Idempotency key no Stripe + unique constraint em `stripe_session_id` |
| PII de participantes exportado para o owner errado | Verificar `event.organizer_id = session.user.id` antes de exportar |
| Senha fraca no registro | zod: mínimo 8 chars, bcrypt rounds 12 |
| Enumeração de usuários por email | `/api/auth/register` retorna sempre 201 (mesmo se email já existe — envia email de "conta já existe") |

---

## Consequências

**Positivo:**
- voz. se torna produto independente, fonte de receita
- Arquitetura multi-tenant clara sem over-engineering (sem schema por tenant)
- LGPD compliance desde o início

**Negativo:**
- Depende de Stripe (vendor lock-in para pagamentos)
- Migration do enum PostgreSQL é DDL pesado — exige downtime ou migration cuidadosa
- Owners com eventos existentes (INCLUIR 2025) precisam ser migrados para o novo modelo

## Alternatives Considered

- **Assinatura mensal (Stripe Subscriptions):** Mais complexo; one-time por evento é mais simples para o modelo de negócio atual
- **Tabela `organizations` separada:** Necessária se houver times — adiada para ADR futuro
- **Clerk/Auth0 para auth:** Adiciona dependency e custo; o sistema de credentials atual é suficiente para o MVP
