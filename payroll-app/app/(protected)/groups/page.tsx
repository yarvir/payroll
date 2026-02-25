import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPermission } from '@/lib/permissions'
import GroupsClient from './GroupsClient'
import type { EmployeeGroup, UserRole } from '@/types/database'

export default async function GroupsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Admin client bypasses recursive RLS on profiles
  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const userRole = (profileData?.role ?? 'employee') as UserRole
  const canManage = await checkPermission(userRole, 'manage_groups')

  const { data: groups } = await supabase
    .from('employee_groups')
    .select('*')
    .order('name')

  // Count employees per group for display
  const { data: empGroupIds } = await supabase
    .from('employees')
    .select('group_id')
    .not('group_id', 'is', null)

  const countByGroup = (empGroupIds ?? []).reduce(
    (acc, { group_id }) => {
      if (group_id) acc[group_id] = (acc[group_id] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <p className="text-sm text-gray-500 mt-1">
          {(groups ?? []).length} group{(groups ?? []).length !== 1 ? 's' : ''}
        </p>
      </div>

      <GroupsClient
        groups={(groups ?? []) as EmployeeGroup[]}
        countByGroup={countByGroup}
        canManage={canManage}
      />
    </div>
  )
}
