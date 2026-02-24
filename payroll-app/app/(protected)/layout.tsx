import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  // Use the service-role admin client to bypass RLS for the profile lookup.
  // The "Owners can read all profiles" RLS policy contains a self-referencing
  // subquery on `profiles` that causes infinite recursion in PostgreSQL,
  // which makes the query fail (error is PGRST204 / infinite recursion).
  // The user has already been verified above via auth.getUser(), so using the
  // admin client here is safe.
  const adminSupabase = createAdminClient()
  const { data: profileData, error: profileError } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  console.log(
    '[Auth] Profile query for user', user.id,
    '| found:', !!profileData,
    '| error:', profileError ? `${profileError.message} (code: ${profileError.code})` : 'none'
  )

  if (!profileData) {
    // Sign out first so the middleware won't redirect the user back from /login
    // to /dashboard, which would create an infinite loop.
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
