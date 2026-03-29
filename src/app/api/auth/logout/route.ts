import { NextResponse } from 'next/server';

const AUTH_COOKIE = 'sellops-auth-token';

export async function POST() {
  const response = NextResponse.json({ success: true, data: null, error: null });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}
