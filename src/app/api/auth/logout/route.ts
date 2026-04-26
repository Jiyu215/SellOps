import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Signs out the current Supabase-authenticated user and responds with a success payload.
 *
 * @returns An object containing `success: true`, `data: null`, and `error: null`.
 */
export async function POST() {
  const supabase = await createClient()

  await supabase.auth.signOut()

  return NextResponse.json({
    success: true,
    data: null,
    error: null,
  })
}