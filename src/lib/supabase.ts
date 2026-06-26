/**
 * Supabase clients (browser and server).
 *
 * Browser clients use the anon key (public, restricted by RLS policies).
 * Server clients use the service-role key (bypasses RLS, required for admin operations).
 *
 * Both are typed with the `Database` generated type for type safety.
 * See `src/lib/db/database.types.ts` for the schema type definitions.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Singleton browser Supabase client.
 *
 * Used in React components and browser-side code.
 * Respects RLS policies (uses anon key).
 *
 * @returns Typed Supabase client instance
 */
let _browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function createBrowserClient() {
  if (!_browserClient) {
    _browserClient = createClient<Database>(url, anonKey);
  }
  return _browserClient;
}

/**
 * Server-side Supabase client for API routes and server actions.
 *
 * MUST use the service-role key (`SUPABASE_SERVICE_ROLE_KEY`) because:
 * - RLS policies are enabled (migration 20260625000002)
 * - Anon key respects RLS, blocking all authenticated operations
 * - Service-role key bypasses RLS (required for server-side operations)
 * - Missing `SUPABASE_SERVICE_ROLE_KEY` throws immediately (fail-fast)
 *
 * @returns Typed Supabase client with service-role permissions
 * @throws When `SUPABASE_SERVICE_ROLE_KEY` is not set
 */
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — server client requires the service-role key.");
  }
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });
}
