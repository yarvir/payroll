import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserPermissions } from '@/lib/permissions'
import { getAllLoans } from './actions'
import LoansClient from './LoansClient'
import type { Profile, EmployeeGroup } from '@/types/database'

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
  const perms = await getUserPermissions(userRole)

  // Only owner, hr, and accountant can view the loans overview
  if (!perms.view_all_employees) redirect('/dashboard')

  const canManage = perms.manage_employees

  const [loans, { data: groups }, { data: employees }] = await Promise.all([
    getAllLoans(),
    admin.from('employee_groups').select('*').order('name'),
    admin.from('employees').select('id, full_name, employee_number').eq('status', 'active').order('full_name'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loans</h1>
        <p className="text-sm text-gray-500 mt-1">{loans.length} loan{loans.length !== 1 ? 's' : ''} total</p>
      </div>

      <LoansClient
        loans={loans}
        groups={(groups ?? []) as EmployeeGroup[]}
        employees={employees ?? []}
        canManage={canManage}
      />
    </div>
  )
}
