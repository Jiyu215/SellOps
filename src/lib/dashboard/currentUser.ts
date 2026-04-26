import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types/dashboard'
import type { OrderMemoActor } from '@/types/orderDetail'

const DASHBOARD_FALLBACK_USER: UserProfile = {
  id: 'dashboard-fallback',
  name: '운영자',
  email: '',
  role: '대시보드 운영자',
  avatarUrl: undefined,
}

/**
 * Resolve the current dashboard user profile, falling back to a predefined admin profile when unauthenticated.
 *
 * The returned profile is built from the authenticated user's data with preference for values stored in the `profiles`
 * table. The `name` is selected in order: `profiles.name`, auth `user_metadata.name`, auth `email`, then the fallback
 * name. The `email` is selected in order: `profiles.email`, auth `email`, then an empty string.
 *
 * @returns A `UserProfile` representing the current dashboard user. If no authenticated user exists, returns `DASHBOARD_FALLBACK_USER`.
 */
export async function getDashboardUser(): Promise<UserProfile> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return DASHBOARD_FALLBACK_USER

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, name')
    .eq('id', user.id)
    .maybeSingle<{ email: string | null; name: string | null }>()

  return {
    id: user.id,
    name: profile?.name ?? user.user_metadata?.name ?? user.email ?? DASHBOARD_FALLBACK_USER.name,
    email: profile?.email ?? user.email ?? '',
    role: '대시보드 운영자',
    avatarUrl: undefined,
  }
}

/**
 * Create an OrderMemoActor representing the current dashboard user.
 *
 * @returns An `OrderMemoActor` whose `name` is the current dashboard user's name and whose `type` is `'admin'`.
 */
export async function getCurrentMemoActor(): Promise<OrderMemoActor> {
  const currentUser = await getDashboardUser()

  return {
    name: currentUser.name,
    type: 'admin',
  }
}
