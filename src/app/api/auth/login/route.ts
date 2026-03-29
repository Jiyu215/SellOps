import { NextResponse } from 'next/server';

// 목업 관리자 계정 (추후 DB 검증으로 교체)
const MOCK_ADMIN = {
  id: 'u-001',
  name: '김운영자',
  email: 'admin@sellops.com',
  role: '슈퍼 어드민',
  password: 'Admin1234!',
};

const AUTH_COOKIE = 'sellops-auth-token';
/** 쿠키 유효 기간: 30일 */
const MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email: string; password: string };
    const { email, password } = body;

    if (email !== MOCK_ADMIN.email || password !== MOCK_ADMIN.password) {
      return NextResponse.json(
        { success: false, data: null, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 },
      );
    }

    const user = {
      id: MOCK_ADMIN.id,
      name: MOCK_ADMIN.name,
      email: MOCK_ADMIN.email,
      role: MOCK_ADMIN.role,
    };

    // 토큰: base64 인코딩 (추후 JWT로 교체)
    const token = Buffer.from(JSON.stringify(user)).toString('base64');

    const response = NextResponse.json({ success: true, data: user, error: null });
    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
