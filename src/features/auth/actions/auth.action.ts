'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Authenticates a user using credentials from `formData` and navigates to the dashboard on success.
 *
 * @param formData - Form data containing `email` and `password` fields
 * @returns `{ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }` if authentication fails, otherwise nothing (redirects to the dashboard)
 */
export async function loginAction(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  redirect('/dashboard')
}

/**
 * Signs out the current user and redirects to the login page.
 */
export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}