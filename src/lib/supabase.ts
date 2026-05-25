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

// Server-side Supabase client (for server actions / API routes)
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? anonKey;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
