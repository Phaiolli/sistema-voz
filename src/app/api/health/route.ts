import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

/** Force dynamic evaluation so the check reflects live dependency state. */
export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe for uptime monitoring and post-deploy smoke tests.
 *
 * Verifies database reachability with a cheap `head` count and reports whether
 * the critical third-party integrations (Clerk, Stripe) have their secrets
 * configured — without exposing any secret value. Returns 200 when the database
 * is reachable and 503 otherwise, so external monitors can alert on it.
 *
 * Intentionally unauthenticated and PII-free: it returns only booleans.
 */
export async function GET() {
  const checks = {
    database: false,
    clerk: Boolean(process.env.CLERK_SECRET_KEY),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    rateLimitDistributed: Boolean(
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
    ),
  };

  try {
    const supabase = createServerClient();
    const { error } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true });
    checks.database = !error;
  } catch {
    checks.database = false;
  }

  const status = checks.database ? "ok" : "degraded";
  return NextResponse.json(
    { status, checks },
    { status: checks.database ? 200 : 503 },
  );
}
