import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Builds a per-request, nonce-based Content-Security-Policy.
 *
 * The nonce lets Next.js's framework/bootstrap scripts run under a strict CSP
 * without `'unsafe-inline'` on `script-src`. `'strict-dynamic'` then trusts any
 * script those nonce'd scripts load at runtime (via `createElement`), which is
 * how Next propagates trust to its chunk loader. Note that `'strict-dynamic'`
 * does NOT cover Clerk's `clerk.browser.js`/`ui.browser.js`: those are emitted
 * as server-rendered (parser-inserted) `<script src>` tags, which need an
 * explicit nonce — the layout forwards it to `<ClerkProvider nonce>` for that.
 * In dev, `'unsafe-eval'` is required
 * because React uses `eval` for richer error overlays; it is never emitted in
 * production.
 *
 * `style-src` keeps `'unsafe-inline'`: Tailwind/shadcn and Next inject inline
 * styles that don't carry a nonce, and inline *styles* cannot execute script,
 * so the residual risk is low. See ADR 014 for the full rationale and the
 * dynamic-rendering trade-off this policy implies.
 *
 * Clerk directives (see ADR 017): Clerk's script tags carry the request nonce
 * (forwarded via `<ClerkProvider nonce>` in the root layout), while
 * `connect-src`/`img-src`/`worker-src`/`frame-src` are still enforced, so its
 * Frontend API, images, web workers and the Turnstile bot-check frame are
 * allow-listed here. `*.clerk.accounts.dev` serves development instances;
 * `clerk.useavoz.app` is the production instance's Frontend API (custom domain).
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://img.clerk.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.clerk.accounts.dev https://clerk.useavoz.app https://clerk-telemetry.com",
    "worker-src 'self' blob:",
    "frame-src https://challenges.cloudflare.com",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Clerk-wrapped middleware.
 *
 * `clerkMiddleware` must run on API routes too so `auth()` has context inside
 * route handlers (the API guards in `lib/api/auth-guard.ts` depend on it) — but
 * API routes don't render React, so they receive no CSP/nonce and pass straight
 * through. Page routes get the per-request nonce CSP plus the role-based gates.
 *
 * Roles are read from the session-token claims (`metadata.role`, mirrored from
 * the Supabase `users` row per ADR 017); this gate is defense-in-depth — the
 * authoritative check lives in the API guards.
 */
export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // API routes: Clerk context is populated by the wrapper; skip CSP/nonce.
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.metadata?.role;
  const isSignedIn = !!userId;

  // One fresh nonce per request. Exposed to the renderer via `x-nonce` (Next
  // reads it from the CSP header to tag its own scripts) and sent to the
  // browser in the CSP response header.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  /** Attaches the CSP header to a response (e.g. an auth redirect). */
  const withCsp = (res: NextResponse): NextResponse => {
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  const redirectTo = (path: string) => withCsp(NextResponse.redirect(new URL(path, req.url)));
  // `redirect_url` is Clerk's return-path convention; <SignIn> reads it to send
  // the user back to the page they were gated from after authenticating.
  const loginRedirect = () =>
    redirectTo(`/entrar?redirect_url=${encodeURIComponent(pathname)}`);

  if (pathname.startsWith("/plataforma")) {
    if (!isSignedIn) return loginRedirect();
    if (role !== "superadmin") return redirectTo("/entrar");
  }

  if (pathname.startsWith("/admin")) {
    if (!isSignedIn) return loginRedirect();
    if (role !== "admin" && role !== "superadmin") return redirectTo("/entrar");
  }

  if (pathname.startsWith("/mediador")) {
    if (!isSignedIn) return loginRedirect();
    if (role !== "admin" && role !== "mediador" && role !== "superadmin")
      return redirectTo("/entrar");
  }

  if (pathname.startsWith("/conta")) {
    if (!isSignedIn) return loginRedirect();
  }

  if (pathname.startsWith("/dashboard")) {
    if (!isSignedIn) return loginRedirect();
    if (role !== "owner" && role !== "admin" && role !== "superadmin")
      return redirectTo("/entrar");
  }

  // Pass-through: forward the nonce to the renderer via request headers and
  // set the CSP on the outgoing response.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
});

export const config = {
  // Clerk's recommended matcher: run on all page routes (so the nonce-based CSP
  // is applied site-wide) and always on API routes (so `auth()` has context in
  // route handlers). Static assets and Next internals are skipped — they don't
  // render React and don't need a nonce.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
