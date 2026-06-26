import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton browser client — evita múltiplas instâncias GoTrueClient no mesmo contexto
let _browserClient: ReturnType<typeof createClient> | null = null;

export function createBrowserClient() {
  if (!_browserClient) {
    _browserClient = createClient(url, anonKey);
  }
  return _browserClient;
}

// Server-side Supabase client (for server actions / API routes).
// MUST use the service-role key: it bypasses RLS, which is required now that
// RLS is enabled (migration 20260625000002). Falling back to the anon key would
// silently break every server query, so we fail fast instead.
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — server client requires the service-role key.");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
