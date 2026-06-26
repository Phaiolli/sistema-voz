# ADR-015: Cobrança por evento via coluna `events.is_paid`

**Status:** Accepted  
**Date:** 2026-06-26  
**Issue:** remediação do audit 2026-06-25 (SW1 — billing per-evento)

## Context

O modelo de cobrança é **por evento**: cada evento é comprado individualmente
(checkout Stripe único). O código anterior decidia o limite de perguntas pelo
`plan` do owner (`getOwnerPlan`), o que tratava a cobrança como assinatura de
conta — incompatível com a cobrança por evento. Um owner com um evento pago
liberava perguntas ilimitadas em **todos** os seus eventos, inclusive os não
pagos; e um owner sem `plan='paid'` ficava limitado mesmo num evento já pago.

Além disso, o webhook do Stripe (`checkout.session.completed`) criava o evento
mas não tinha registro idempotente robusto: em re-tentativas do Stripe podia
duplicar eventos ou engolir falhas retornando 200, perdendo a confirmação do
pagamento.

## Decision

1. **Coluna `events.is_paid`** (`boolean NOT NULL DEFAULT false`). É a **fonte
   da verdade** do gate de cobrança por evento. Migration
   `20260626000002_events_is_paid.sql` adiciona a coluna e faz backfill a partir
   de `event_payments` com `status='paid'`. Refletida em `schema.ts` (Drizzle) e
   em `database.types.ts`.

2. **Gate de perguntas por evento.** Em
   `POST /api/v1/events/[id]/questions`, o select do evento inclui `is_paid`. Se
   `!event.is_paid`, aplica-se `FREE_QUESTION_LIMIT` (403
   `QUESTION_LIMIT_REACHED` ao exceder); se pago, ilimitado. `getOwnerPlan` deixa
   de ser usado nesse gate. `plan-limits.ts` ganha `isEventPaid(eventId)`.

3. **`users.plan='paid'` = "cliente pagante".** O campo `plan` deixa de governar
   limites de evento e passa a significar apenas que o owner já pagou ao menos um
   evento — usado para badges/estatísticas. O webhook seta `plan='paid'` no owner
   após confirmar o pagamento.

4. **Idempotência do webhook.** O `select` de `existingPayment` inclui
   `event_id`. O id do evento é reaproveitado de uma tentativa anterior
   (`existingPayment?.event_id`) ou gerado novo; o evento só é inserido se ainda
   não existir, via `upsert(..., { onConflict: "id" })` com `is_paid: true`.
   Falhas em qualquer passo crítico (insert do evento, update de
   `event_payments`, update do `plan` do owner) retornam **500** para o Stripe
   re-tentar, em vez de engolir o erro e retornar 200.

## Consequences

- O limite de perguntas passa a ser corretamente isolado por evento; pagar um
  evento não afeta os demais.
- O webhook é seguro contra re-entrega do Stripe (não duplica eventos) e não
  perde confirmações de pagamento silenciosamente.
- `plan` continua existindo apenas como rótulo de "cliente pagante"; qualquer
  lógica futura de limite por evento deve usar `events.is_paid`, não `plan`.
- A migration precisa ser aplicada antes do deploy do código que lê `is_paid`.
