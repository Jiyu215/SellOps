import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

type AuthOk  = { ok: true;  user: User }
type AuthFail = { ok: false; response: NextResponse }

/**
 * Route Handler 인증 가드.
 * 세션이 유효하면 { ok: true, user }를 반환하고,
 * 미인증이면 { ok: false, response } (401)를 반환한다.
 *
 * @example
 * export async function GET() {
 *   const auth = await requireAuth()
 *   if (!auth.ok) return auth.response
 *   // auth.user 사용 가능
 * }
 */
export async function requireAuth(): Promise<AuthOk | AuthFail> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 },
      ),
    }
  }

  return { ok: true, user }
}
