'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Inner component using useSearchParams — must be wrapped in <Suspense>.
 *
 * Handles all three Supabase auth callback flows:
 *
 * 1. PKCE code flow  — ?code=...
 *    Supabase (PKCE project) redirects here with a code after verifying the
 *    invite/magic-link token.
 *
 * 2. Email OTP flow  — ?token_hash=...&type=...
 *    Newer Supabase email templates link directly to the app with a token_hash.
 *
 * 3. Implicit (legacy) flow  — #access_token=...&type=invite
 *    Older Supabase projects and the default invite email template redirect
 *    through supabase.co/auth/v1/verify which then appends tokens as a URL
 *    fragment. Fragments are never sent to the server, so this MUST be handled
 *    client-side.
 */
function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Read the hash BEFORE creating the Supabase client — the client clears it
    // during initialisation when it detects implicit-flow tokens.
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const hashType = hashParams.get('type')
    const hasHashToken = hashParams.has('access_token')

    const supabase = createClient()
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const urlType = searchParams.get('type')
    // Prefer URL query param; fall back to hash fragment param
    const type = urlType ?? hashType
    const next = searchParams.get('next') ?? '/dashboard'

    async function run() {
      // ── 1. PKCE code flow ──────────────────────────────────────────────────
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          router.replace(type === 'invite' ? '/auth/set-password' : next)
          return
        }
      }

      // ── 2. Email OTP / token_hash flow ────────────────────────────────────
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as EmailOtpType,
        })
        if (!error) {
          router.replace(type === 'invite' ? '/auth/set-password' : next)
          return
        }
      }

      // ── 3. Implicit (legacy) flow — tokens in URL hash fragment ───────────
      // The Supabase JS client auto-detects and processes #access_token=…
      // during getSession(), establishing the session from the fragment.
      if (hasHashToken) {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session) {
          router.replace(hashType === 'invite' ? '/auth/set-password' : next)
          return
        }
      }

      router.replace('/login?error=auth_callback_failed')
    }

    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Signing you in…</p>
      {/* Suspense is required when useSearchParams is used inside a page */}
      <Suspense>
        <CallbackHandler />
      </Suspense>
    </div>
  )
}
