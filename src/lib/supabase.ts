import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser/client-side Supabase client (for Realtime subscriptions)
export function createBrowserClient() {
  return createClient(url, anonKey);
}

// Server-side Supabase client (for server actions / API routes)
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? anonKey;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
