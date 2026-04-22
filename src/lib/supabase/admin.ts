import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// RLS 우회 — Route Handler 서버 측에서만 사용
export function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
