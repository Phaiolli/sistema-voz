# ADR-006: Mediator Event Ownership via mediator_assignments Table

**Date:** 2026-05-21  
**Status:** Accepted  
**Deciders:** Phaiolli

## Context

Mediators must be scoped to specific events. A mediator should only access the events they are explicitly assigned to, not all events on the platform.

## Decision

Use a `mediator_assignments` join table with a composite UNIQUE constraint on `(event_id, user_id)` to associate mediators with events.

- `GET /api/v1/me/assignments` returns all events for admin, and only assigned events (with full event data) for mediators.
- Middleware (`src/middleware.ts`) enforces that `/mediador/*` routes require at least the `mediador` role; actual event ownership is checked at the component level (dashboard fetches `/me/assignments` and filters by eventId).
- A mediator with no assignments sees an empty dashboard state with a clear "no event assigned" message.

## Alternatives Considered

1. **Role-per-event via JWT claims** — include event IDs in the JWT. Rejected: tokens become large; assignments change dynamically and would require re-issuing tokens.
2. **Check ownership in middleware** — query the DB in the Edge middleware function. Rejected: increases latency on every request and complicates the middleware; better handled per-route.

## Consequences

- Clean separation: middleware handles role-level access; components handle resource-level ownership.
- Adding a mediator to multiple events is supported — just add multiple rows to `mediator_assignments`.
- Removing a mediator from an event (`DELETE /api/v1/events/[id]/mediators/[userId]`) does not delete the user account.
