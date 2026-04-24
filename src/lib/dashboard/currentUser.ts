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

export async function getCurrentMemoActor(): Promise<OrderMemoActor> {
  const currentUser = await getDashboardUser()

  return {
    name: currentUser.name,
    type: 'admin',
  }
}
