import { createClient } from '@/lib/supabase/server'
import { canViewSensitive, canManageEmployees } from '@/lib/roles'
import EmployeeTable from './EmployeeTable'
import type { Employee, EmployeeGroup, Profile, UserRole } from '@/types/database'

export default async function EmployeesPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const profile = profileData as Profile | null
  const userRole = (profile?.role ?? 'employee') as UserRole
  const viewSensitive = canViewSensitive(userRole)
  const manageEmployees = canManageEmployees(userRole)

  const { data: groups } = await supabase
    .from('employee_groups')
    .select('*')
    .order('name')

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
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Employee
          </button>
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
