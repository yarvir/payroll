import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import type { Profile } from '@/types/database'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profileData) {
    // Sign out first so the middleware won't redirect the user back from /login
    // to /dashboard, which would create an infinite loop.
    console.error('[Auth] No profile row found for authenticated user:', user.id, user.email)
    await supabase.auth.signOut()
    redirect(
      '/login?error=' +
        encodeURIComponent(
          'Your account is not fully set up. Please contact your administrator.'
        )
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar profile={profileData as Profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
