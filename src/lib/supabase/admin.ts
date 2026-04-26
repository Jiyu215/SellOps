import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * Creates a Supabase client configured with the service-role (admin) credential for server-side use.
 *
 * This client is intended for server-only operations that require elevated privileges and will operate with
 * the project's service-role key, allowing actions that bypass Row Level Security.
 *
 * @returns A Supabase client instance authenticated with the project's service-role key, typed to `Database`.
 */
export function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
