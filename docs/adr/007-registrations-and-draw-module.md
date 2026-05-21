# ADR-007: Módulo de Inscrições e Sorteio

**Status:** Accepted  
**Date:** 2026-05-21  
**Issues:** #35, #36

## Context

The platform needed a public registration flow for events, with QR-code-based credentialing and a draw feature for registered attendees.

## Decisions

### Registration storage

A dedicated `registrations` table was added (separate from `participants`, which tracks anonymous Q&A submitters). This gives clean separation between event attendees and question authors.

### Public endpoint with rate limiting

`POST /api/v1/events/[id]/registrations` is unauthenticated (public). Rate limiting (5 per IP per hour) is enforced by storing the requester IP in `author_ip` and counting recent inserts before accepting new ones — same pattern as the questions endpoint.

### QR code with embedded logo

QR codes are generated client-side using the `qrcode` npm package on an HTML Canvas. The voz. logo badge is composited directly into the pixel data before export, so downloaded PNGs include the logo (CSS overlays would be presentation-only and invisible in downloads).

### Draw eligibility

Only registrants with `checked_in = true` participate in a draw. This enforces the business rule that the winner must be physically present. Each draw marks the winner as `drawn = true`; subsequent draws exclude past winners.

### Draw reset

Admin-only `DELETE /api/v1/events/[id]/draw` resets all `drawn = false` for the event, enabling a fresh draw round without deleting records.

## Consequences

- `registrations` table must be migrated before the module is live (`supabase/migrations/20260521000001_add_registrations_only.sql`).
- Canvas-based QR generation requires a browser environment; the function is in `src/lib/qr.ts` and must not be imported from server components.
- Email uniqueness per event is enforced at the DB level (`registrations_event_email_idx`), preventing double registration even under race conditions.
