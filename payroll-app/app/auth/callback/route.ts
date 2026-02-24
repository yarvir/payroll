import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Invite tokens must always land on set-password regardless of next param
      const redirect = type === 'invite' ? '/auth/set-password' : next
      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  if (token_hash && type) {
    // Used by invite and magic-link emails (PKCE flow)
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    })
    if (!error) {
      // Invite tokens must always land on set-password regardless of next param
      const redirect = type === 'invite' ? '/auth/set-password' : next
      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
