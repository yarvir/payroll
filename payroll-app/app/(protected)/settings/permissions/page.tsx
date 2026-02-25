import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllPermissions } from '@/lib/permissions'
import PermissionsClient from './PermissionsClient'

export default async function PermissionsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Only owners can access this page
  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if (profileData?.role !== 'owner') {
    redirect('/dashboard')
  }

  const [permissions, rolesData] = await Promise.all([
    getAllPermissions(),
    admin.from('roles').select('id, name').neq('id', 'owner').order('is_default', { ascending: false }).order('name'),
  ])

  // All non-owner roles become columns on the permissions table
  const roles = (rolesData.data ?? []) as { id: string; name: string }[]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Permissions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure what each role can access and do. Owner always has full access.
        </p>
      </div>

      <PermissionsClient permissions={permissions} roles={roles} />
    </div>
  )
}
