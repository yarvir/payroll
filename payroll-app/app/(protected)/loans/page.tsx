import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserPermissions } from '@/lib/permissions'
import { getAllLoans } from './actions'
import LoansClient from './LoansClient'
import type { Profile, Employee, EmployeeGroup } from '@/types/database'

export default async function LoansPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const profile = profileData as Profile | null
  const userRole = profile?.role ?? 'employee'

  // Employees cannot access the loans overview page
  if (!['owner', 'hr', 'accountant'].includes(userRole)) {
    redirect('/dashboard')
  }

  const perms = await getUserPermissions(userRole)
  const canManage = perms.manage_employees  // owner + hr

  const [loans, { data: groupsData }, { data: employeesData }] = await Promise.all([
    getAllLoans(),
    supabase.from('employee_groups').select('*').order('name'),
    admin.from('employees').select('id, full_name, employee_number, status').eq('status', 'active').order('full_name'),
  ])

  const groups = (groupsData ?? []) as EmployeeGroup[]
  const employees = (employeesData ?? []) as Pick<Employee, 'id' | 'full_name' | 'employee_number'>[]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Loans</h1>
        <p className="text-sm text-gray-500 mt-1">
          {loans.length} loan{loans.length !== 1 ? 's' : ''} total
        </p>
      </div>

      <LoansClient
        loans={loans}
        groups={groups}
        employees={employees.map(e => ({
          id: e.id,
          full_name: e.full_name,
          employee_number: e.employee_number,
        }))}
        canManage={canManage}
      />
    </div>
  )
}
