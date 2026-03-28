import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE = 'sellops-auth-token';

/**
 * 미들웨어: /dashboard 하위 모든 경로를 인증 게이트로 보호
 * - 쿠키 없음 → /auth/login?callbackUrl=원래경로 로 리다이렉트
 * - 쿠키 있음 → 통과
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // /dashboard 및 /dashboard/** 전체 보호
  matcher: ['/dashboard/:path*'],
};
