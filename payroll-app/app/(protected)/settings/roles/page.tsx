import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import RolesClient from './RolesClient'
import type { Role } from '@/types/database'

export default async function RolesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if (profileData?.role !== 'owner') redirect('/dashboard')

  const { data: roles } = await admin
    .from('roles')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage roles that can be assigned to users. Configure permissions for each role on the{' '}
          <a href="/settings/permissions" className="text-indigo-600 hover:underline">
            Permissions
          </a>{' '}
          page.
        </p>
      </div>

      <RolesClient roles={(roles ?? []) as Role[]} />
    </div>
  )
}
