# ADR-018: Assinatura `pro`, precificação por lookup_key e webhook Stripe consolidado

**Status:** Accepted
**Date:** 2026-07-03
**Relaciona-se a:** ADR-009 (SaaS multitenancy Stripe), ADR-015 (billing per-evento
`is_paid`). Estende, não revoga, o modelo per-evento.

## Context

A Stripe já estava integrada em modo **pagamento avulso por evento** (checkout
`mode=payment` com `price_data` inline de R$ 59,90; `event_payments`; webhook em
`/api/webhooks/stripe` tratando só `checkout.session.completed`; `users.plan` =
`free|paid` como selo).

Foi solicitado (doc `integração-stripe.md`) evoluir para três planos, com uma
**assinatura mensal** nova, precificação por `lookup_key` e uso de uma conta
Stripe LIVE **compartilhada** entre vários projetos.

Restrições da conta compartilhada:
- Todo objeto criado pelo código DEVE levar `metadata.app = "voz"` (+ `plan_slug`)
  — é o único jeito de separar os dados do Voz dos outros projetos.
- Preços referenciados por `lookup_key`, nunca por IDs `price_`/`prod_`
  hardcodados. Produtos/preços já existem; o código não os cria nem edita.

## Decision

1. **Três planos, dois eixos de cobrança** (decisão do produto):
   | plan_slug | lookup_key        | Cobrança             | Entitlement |
   |-----------|-------------------|----------------------|-------------|
   | `free`    | —                 | não passa na Stripe  | 1 evento, 15 perguntas/evento |
   | `event`   | `voz_event`       | avulso `mode=payment`| aquele evento fica ilimitado (fluxo atual) |
   | `pro`     | `voz_pro_monthly` | assinatura `mode=subscription` | **eventos ilimitados**, sem pagar avulso |

   `event` e `pro` **coexistem**: o avulso continua para quem não assina.

2. **Modelo aditivo no schema** (não revoga ADR-015). A cobrança per-evento
   (`events.is_paid` + `event_payments`) fica intacta. Para a assinatura,
   adiciona-se a `users`: `stripe_customer_id` (unique), `stripe_subscription_id`,
   `subscription_status`, `current_period_end`. **"É pro?"** = assinatura ativa
   (`subscription_status ∈ {active, trialing}`), derivado por
   `isOwnerPro(ownerId)`. O enum legado `users.plan` (`free|paid`) permanece como
   selo de "já pagou algum evento" — os ~19 usos existentes não mudam.

3. **Entitlement do `pro`** aplicado nos dois pontos de enforcement:
   - criação de evento (`POST /api/v1/events`): dono `pro` ignora
     `FREE_EVENT_LIMIT`;
   - envio de pergunta (`POST /api/v1/events/:id/questions`): evento é ilimitado
     se `is_paid` **ou** o dono é `pro`.

4. **Webhook consolidado** em `POST /api/stripe/webhook`, tratando os 5 eventos
   (`checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`).
   A lógica per-evento (idempotente, `deterministicEventId`) migra para cá. O
   endpoint antigo `/api/webhooks/stripe` é removido. Eventos com
   `metadata.app !== "voz"` são ignorados (conta compartilhada).

5. **Precificação por `lookup_key`**: o checkout de evento passa a resolver
   `voz_event` via `getPriceByLookupKey`; a assinatura usa `voz_pro_monthly`.
   Nenhum ID `price_`/`prod_` no código. Constantes de **exibição** de valor na UI
   (ex.: "R$ 59,90") permanecem como texto — não são IDs.

6. **Customer Portal** (`POST /api/v1/stripe/portal`) para o assinante gerenciar/
   cancelar; cancelamento (via `customer.subscription.deleted`) rebaixa para free.

7. **URLs**: reusa `/pagamento/sucesso` e `/pagamento/cancelado` já existentes;
   cria `/planos` (pricing + assinar `pro`). Retorno do portal = `/conta`.

## Consequences

**Positivo**
- Assinatura recorrente sem quebrar o billing per-evento consolidado (ADR-015).
- Dados isolados na conta Stripe compartilhada via `metadata.app`.
- Preços geridos no dashboard (lookup_key), sem deploy para reajuste.

**Negativo / custo**
- Duas fontes de "acesso pago" (per-evento e assinatura) — o gating de perguntas
  passa a checar ambas.
- **Passos humanos** (fora do código): restricted key com escopos corretos;
  criar o endpoint de webhook em `/api/stripe/webhook` (novo signing secret em
  `STRIPE_WEBHOOK_SECRET`); ligar o Customer Portal; garantir os `lookup_key`
  `voz_event`/`voz_pro_monthly` nos preços. `STRIPE_PORTAL_RETURN_URL` no `.env`.

## Alternatives Considered

- **`pro` substitui o avulso**: reescreveria o billing per-evento (ADR-015) e a
  UI. Descartado — coexistência é menos ruptura.
- **Migrar `users.plan` para `plan_slug` (free|event|pro)**: tocaria ~19 arquivos
  e o billing per-evento. Descartado a favor do modelo aditivo (derivar `pro` da
  assinatura), princípio de mudança cirúrgica.
- **Manter dois webhooks separados**: mais superfície e config. Descartado a favor
  de um endpoint único.
