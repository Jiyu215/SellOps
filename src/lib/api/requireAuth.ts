import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

type AuthOk = { ok: true; user: User }
type AuthFail = { ok: false; response: NextResponse }

/**
 * Guard that enforces dashboard authentication using the Supabase session.
 *
 * Considers a user authenticated if a valid dashboard session exists; it does not verify role or permission claims.
 *
 * @returns `{ ok: true, user }` when an authenticated user is present; `{ ok: false, response }` where `response` is a `NextResponse` containing `{ error: '인증이 필요합니다.' }` with HTTP status `401` when no user is found.
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
