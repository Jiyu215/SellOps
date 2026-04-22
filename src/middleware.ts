import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * 미들웨어: Supabase Auth 기반 인증 가드
 *
 * - 비로그인 사용자 → /auth/login 으로 리다이렉트
 * - 로그인 상태 → /auth 페이지 접근 시 /dashboard로 리다이렉트
 * - 그 외 요청 → 그대로 통과
 *
 * ※ Supabase session cookie 기반으로 user 상태를 확인한다
 */

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isAuthPage    = pathname.startsWith('/auth');
  const isApiRoute    = pathname.startsWith('/api');
  // /auth/register는 로그인한 운영자만 접근 가능한 운영자 전용 페이지
  const isRegisterPage = pathname === '/auth/register';

  // 비로그인 → /auth/register 포함 보호 경로 차단
  if (!user && !isApiRoute && (!isAuthPage || isRegisterPage)) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // 로그인 상태 → /auth/* 접근 시 대시보드로 (단 /auth/register 제외)
  if (user && isAuthPage && !isRegisterPage) {
    return NextResponse.redirect(new URL('/dashboard/dashboard', request.url));
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}