import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

const MAX_AGE = 60 * 60 * 24 * 30

/**
 * Authenticate a user with Supabase using an email and password, apply session cookies, and return a JSON response with the authenticated user.
 *
 * @param request - NextRequest whose JSON body must include `email` and `password`
 * @returns A NextResponse with JSON `{ success, data, error }`. On success `data` is `{ id, email, name }` and the response is 200. If credentials are invalid the response is 401 with `error: '이메일 또는 비밀번호가 올바르지 않습니다.'`. On unexpected failures the response is 500 with `error: '서버 오류가 발생했습니다.'`.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json() as {
      email: string
      password: string
    }

    /**
     * Next.js 15+에서 Route Handler 내 cookies() from next/headers는 읽기 전용이다.
     * supabase.auth.signInWithPassword()가 세션 쿠키를 기록하려 할 때
     * cookieStore.set()을 호출하면 예외가 발생해 500이 된다.
     *
     * 해결: request.cookies로 읽고, setAll에서 쿠키를 버퍼에 모은 뒤
     *       NextResponse 생성 후 response.cookies에 일괄 적용한다.
     */
    type SetArgs = Parameters<typeof response.cookies.set>
    const pendingCookies: SetArgs[] = []

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              pendingCookies.push([name, value, options])
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, data: null, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // profiles 테이블에서 추가 정보 조회 (실패해도 기본값 사용)
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', data.user.id)
      .maybeSingle<{ name: string | null }>()

    const user = {
      id:    data.user.id,
      email: data.user.email ?? '',
      name:  profile?.name ?? data.user.user_metadata?.name ?? '운영자',
    }

    const response = NextResponse.json({ success: true, data: user, error: null })

    // Supabase 세션 쿠키를 응답에 적용
    pendingCookies.forEach((args) => response.cookies.set(...args))

    // 호환성 토큰 (btoa는 Latin-1만 지원하므로 Buffer 사용)
    const token = Buffer.from(JSON.stringify(user)).toString('base64')
    response.cookies.set('sellops-auth-token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   MAX_AGE,
      path:     '/',
    })

    return response
  } catch (err) {
    console.error('LOGIN API ERROR:', err)
    return NextResponse.json(
      { success: false, data: null, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}