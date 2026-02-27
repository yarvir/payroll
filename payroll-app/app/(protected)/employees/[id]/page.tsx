import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserPermissions } from '@/lib/permissions'
import { getPaymentMethods } from '../actions'
import EmployeeDetailClient from './EmployeeDetailClient'
import type { Employee, EmployeeGroup, Department, Profile } from '@/types/database'

interface Props {
  params: { id: string }
}

export default async function EmployeeDetailPage({ params }: Props) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
  const canManage = perms.manage_employees

  // Fetch the employee with their group info
  const { data: empData } = await admin
    .from('employees')
    .select('*, employee_groups(id, name)')
    .eq('id', params.id)
    .single()

  if (!empData) notFound()

  const employee = empData as Employee & { employee_groups: EmployeeGroup | null }

  // Sensitive employees are only visible to roles with view_all_employees
  if (employee.is_sensitive && !viewSensitive) notFound()

  const [paymentMethods, { data: groups }, { data: departments }] = await Promise.all([
    getPaymentMethods(params.id),
    supabase.from('employee_groups').select('*').order('name'),
    supabase.from('departments').select('*').order('name'),
  ])

  return (
    <EmployeeDetailClient
      employee={employee}
      paymentMethods={paymentMethods}
      groups={(groups ?? []) as EmployeeGroup[]}
      departments={(departments ?? []) as Department[]}
      canManage={canManage}
      viewSensitive={viewSensitive}
    />
  )
}
