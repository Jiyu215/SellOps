import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

type AuthOk = { ok: true; user: User }
type AuthFail = { ok: false; response: NextResponse }

/**
 * 대시보드 API 인증 가드.
 *
 * 정책: SellOps는 관리자 전용 대시보드 
 * 이 대시보드에 로그인할 수 있는 사용자는 관리자 사용자로 간주
 * 이 가드는 별도의 role/permission claim이 아니라 유효한 대시보드 세션이 있는지만 확인
 *
 * 추후 고객용 계정, 읽기 전용 직원 계정처럼 권한이 분리된 계정 유형이 생기면
 * requireDashboardPermission() 같은 권한 기반 가드로 교체
 *
 * @example
 * export async function GET() {
 *   const auth = await requireAuth()
 *   if (!auth.ok) return auth.response
 *   // 여기서 auth.user를 사용
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
