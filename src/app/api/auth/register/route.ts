import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api/requireAuth'

interface RegisterBody {
  email: string
  password: string
  name?: string
}

/**
 * Creates an operator (admin) user in Supabase from the incoming request body after validating input, and returns a JSON HTTP response indicating success or failure.
 *
 * @returns A Next.js JSON HTTP response:
 * - On success (201): `{ success: true, data: { id?: string, email: string } }`
 * - On validation failure (400): `{ success: false, error: string }`
 * - If the email is already registered (409): `{ success: false, error: string }`
 * - On unexpected errors (500): `{ success: false, error: string }`
 */
export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { email, password, name } = await request.json() as RegisterBody
    const supabaseAdmin = getSupabaseAdmin()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '이메일과 비밀번호는 필수입니다.' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: '비밀번호는 8자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    // 운영자 계정 생성 (이메일 인증 없이 즉시 활성화)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name ?? '' },
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return NextResponse.json(
          { success: false, error: '이미 등록된 이메일입니다.' },
          { status: 409 }
        )
      }
      throw error
    }

    // profiles 테이블에 이름 저장 (테이블이 없으면 무시)
    if (name && data.user) {
      await supabaseAdmin
        .from('profiles')
        .upsert({ id: data.user.id, name }, { onConflict: 'id' })
    }

    return NextResponse.json(
      { success: true, data: { id: data.user?.id, email } },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { success: false, error: '운영자 등록에 실패했습니다.' },
      { status: 500 }
    )
  }
}
