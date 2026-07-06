"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";

const CONSENT_KEY = "voz-cookie-consent";
type Consent = "accepted" | "rejected";
/** `null` = user has not decided yet; `"pending"` = server/unknown (hide banner). */
type Snapshot = Consent | null | "pending";

const listeners = new Set<() => void>();

function readConsent(): Consent | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Client snapshot: the persisted choice, or `null` when undecided. */
function getSnapshot(): Snapshot {
  return readConsent();
}

/** Server snapshot: keep the banner hidden during SSR to avoid a flash. */
function getServerSnapshot(): Snapshot {
  return "pending";
}

function decide(value: Consent) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Storage blocked: the choice holds only for this session.
  }
  listeners.forEach((l) => l());
}

/**
 * LGPD cookie-consent banner. Non-essential analytics only mount after the user
 * explicitly accepts; the decision persists in localStorage. Analytics is also
 * gated by `NEXT_PUBLIC_ANALYTICS_ENABLED` so it can be disabled per environment.
 *
 * Rendered once in the root layout. Uses `useSyncExternalStore` so reading the
 * persisted choice is hydration-safe and free of effect-driven re-renders.
 */
export function ConsentBanner() {
  const consent = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";

  return (
    <>
      {analyticsEnabled && consent === "accepted" ? <Analytics /> : null}

      {consent === null ? (
        <div
          role="dialog"
          aria-label="Consentimento de cookies"
          className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-background/95 px-4 py-4 backdrop-blur"
        >
          <div className="mx-auto flex max-w-[1120px] flex-col items-start gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-muted-foreground">
              Usamos cookies essenciais para o funcionamento e, com seu
              consentimento, cookies de análise para melhorar a plataforma. Veja
              a{" "}
              <Link
                href="/privacidade"
                className="underline hover:text-foreground"
              >
                Política de Privacidade
              </Link>
              .
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => decide("rejected")}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Recusar
              </button>
              <button
                type="button"
                onClick={() => decide("accepted")}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Aceitar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
