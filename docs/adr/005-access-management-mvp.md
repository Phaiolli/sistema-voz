# ADR-005: Access Management MVP — Manual Credential Sharing

**Date:** 2026-05-21  
**Status:** Accepted  
**Deciders:** Phaiolli

## Context

The voz. platform requires two roles: `admin` (manages events and users) and `mediador` (moderates a specific event). We needed a simple access model to ship the MVP quickly without building email invitation flows, token links, or self-registration.

## Decision

Admins create mediator accounts manually via the `/admin/usuarios` UI. Credentials (email + password) are shared out-of-band (e.g., WhatsApp, email). There is no invite system, no password reset flow, and no self-registration in this version.

Key constraints:
- Password minimum: 8 chars, 1 uppercase, 1 number (enforced by `createUserSchema`)
- Passwords stored as bcrypt-12 hashes — never returned in API responses
- `mediator_assignments` table ties a mediator to a specific event; a mediator can only see and operate on their assigned event(s)
- `DELETE /api/v1/events/[id]/mediators/[userId]` removes the assignment (not the user)

## Alternatives Considered

1. **Email invitation flow** — sends a one-time link to the mediator. Rejected: requires email infrastructure (SendGrid/Resend), email verification, token expiry logic. Too complex for MVP.
2. **Self-registration with role approval** — users sign up, admin approves. Rejected: UX complexity, requires moderation queue.

## Consequences

- Simpler to build and deploy; no external email service dependency for MVP.
- Security relies on admin discipline when choosing passwords and sharing them securely.
- Future iteration (ADR-006) will replace this with an invite system using time-limited tokens sent via email.
