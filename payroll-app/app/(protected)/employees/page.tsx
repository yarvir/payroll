import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserPermissions } from '@/lib/permissions'
import EmployeeTable from './EmployeeTable'
import AddEmployeeButton from './AddEmployeeButton'
import type { Employee, EmployeeGroup, Profile } from '@/types/database'

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
  const viewSensitive = perms.view_sensitive_employees
  const manageEmployees = perms.manage_employees

  const { data: groups } = await supabase.from('employee_groups').select('*').order('name')

  const { data: employees } = await supabase
    .from('employees')
    .select('*, employee_groups(id, name)')
    .order('full_name')

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
        viewSensitive={viewSensitive}
        userRole={userRole}
      />
    </div>
  )
}
