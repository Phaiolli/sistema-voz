/**
 * Canonical site metadata used across SEO surfaces (layout metadata, sitemap,
 * robots, OpenGraph). Centralised here so the production URL is defined once.
 *
 * The base URL falls back to the production domain but can be overridden per
 * environment via `NEXT_PUBLIC_APP_URL` (already used by the Stripe redirects).
 */

/** Production domain of the public SaaS. */
export const PRODUCTION_URL = "https://useavoz.app";

/** Absolute base URL for the current environment (no trailing slash). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? PRODUCTION_URL
).replace(/\/$/, "");

/** Human-facing product name. */
export const SITE_NAME = "voz.";

/** Default meta description for public marketing surfaces. */
export const SITE_DESCRIPTION =
  "Plataforma de perguntas ao vivo para eventos presenciais. O público envia perguntas pelo celular e o mediador conduz em tempo real.";

/** Contact address of the LGPD data protection officer (Encarregado). */
export const DPO_EMAIL = "privacidade@useavoz.app";

/** General support address. */
export const SUPPORT_EMAIL = "suporte@useavoz.app";
