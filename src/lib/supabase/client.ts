import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service-role key.
 *
 * All KnowBody data access happens through Next.js server code (LINE webhook,
 * LIFF API routes, cron). We identify the user server-side from a verified LINE
 * signature / ID token, so we intentionally use the service role and keep RLS as
 * a deny-by-default backstop. NEVER import this into client components.
 */

let _client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/** Storage bucket for meal photos. */
export const MEAL_BUCKET = "meal-photos";
