'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  console.log('[Login] Attempting sign in for:', email)

  let signInError: string | null = null

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('[Login] Auth error:', error.message, '| Status:', error.status)
      signInError = error.message
    } else {
      console.log('[Login] Sign in successful for:', email)
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'An unexpected error occurred'
    console.error('[Login] Unexpected exception during sign in:', e)
    signInError = message
  }

  if (signInError) {
    redirect('/login?error=' + encodeURIComponent(signInError))
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
