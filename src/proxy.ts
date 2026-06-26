import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Builds a per-request, nonce-based Content-Security-Policy.
 *
 * The nonce lets Next.js's framework/bootstrap scripts run under a strict CSP
 * without `'unsafe-inline'` on `script-src`. `'strict-dynamic'` then trusts any
 * script those nonce'd scripts load, which is how Next propagates trust to its
 * chunk loader. In dev, `'unsafe-eval'` is required because React uses `eval`
 * for richer error overlays; it is never emitted in production.
 *
 * `style-src` keeps `'unsafe-inline'`: Tailwind/shadcn and Next inject inline
 * styles that don't carry a nonce, and inline *styles* cannot execute script,
 * so the residual risk is low. See ADR 014 for the full rationale and the
 * dynamic-rendering trade-off this policy implies.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

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
  const loginRedirect = () =>
    redirectTo(`/entrar?callbackUrl=${encodeURIComponent(pathname)}`);

  if (pathname.startsWith("/plataforma")) {
    if (!user) return loginRedirect();
    if (user.role !== "superadmin") return redirectTo("/entrar");
  }

  if (pathname.startsWith("/admin")) {
    if (!user) return loginRedirect();
    if (user.role !== "admin" && user.role !== "superadmin") return redirectTo("/entrar");
  }

  if (pathname.startsWith("/mediador")) {
    if (!user) return loginRedirect();
    if (user.role !== "admin" && user.role !== "mediador" && user.role !== "superadmin")
      return redirectTo("/entrar");
  }

  if (pathname.startsWith("/conta")) {
    if (!user) return loginRedirect();
  }

  if (pathname.startsWith("/dashboard")) {
    if (!user) return loginRedirect();
    if (user.role !== "owner" && user.role !== "admin" && user.role !== "superadmin")
      return redirectTo("/entrar");
  }

  // Pass-through: forward the nonce to the renderer via request headers and
  // set the CSP on the outgoing response.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
});

export const config = {
  // Run on all pages so the nonce-based CSP is applied site-wide, but skip API
  // routes, Next static/image assets, and common metadata files (they don't
  // render React and don't need a nonce). Auth guards still key off `pathname`,
  // so widening the matcher doesn't change their behaviour.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
