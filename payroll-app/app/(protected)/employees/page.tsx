import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserPermissions } from '@/lib/permissions'
import EmployeeTable from './EmployeeTable'
import AddEmployeeButton from './AddEmployeeButton'
import type { Employee, EmployeeGroup, Department, Profile } from '@/types/database'

export default async function EmployeesPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Use admin client for profile read to bypass the recursive RLS policy on profiles
  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const profile = profileData as Profile | null
  const userRole = profile?.role ?? 'employee'
  const perms = await getUserPermissions(userRole)
  const viewSensitive = perms.view_all_employees
  const manageEmployees = perms.manage_employees

  const [
    { data: groups },
    { data: employees },
    { data: departments },
  ] = await Promise.all([
    supabase.from('employee_groups').select('*').order('name'),
    supabase.from('employees').select('*, employee_groups(id, name)').order('full_name'),
    supabase.from('departments').select('*').order('name'),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-1">
            {employees?.length ?? 0} total employee
            {(employees?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        {manageEmployees && (
          <AddEmployeeButton
            groups={(groups ?? []) as EmployeeGroup[]}
            departments={(departments ?? []) as Department[]}
          />
        )}
      </div>

      <EmployeeTable
        employees={
          (employees ?? []) as unknown as (Employee & {
            employee_groups: EmployeeGroup | null
          })[]
        }
        groups={(groups ?? []) as EmployeeGroup[]}
        departments={(departments ?? []) as Department[]}
        viewSensitive={viewSensitive}
        userRole={userRole}
      />
    </div>
  )
}
