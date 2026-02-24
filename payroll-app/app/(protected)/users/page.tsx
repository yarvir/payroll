import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import UsersClient from './UsersClient'
import type { Employee, Profile } from '@/types/database'

export default async function UsersPage() {
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
  if (!profile || profile.role !== 'owner') redirect('/dashboard')

  // Fetch all auth users (up to 1000 for a payroll app)
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const authUsers = authData?.users ?? []

  // Fetch all profiles and employees for joining
  const { data: profilesData } = await admin.from('profiles').select('*')
  const profiles = profilesData as Profile[] | null
  const { data: employeesData } = await admin
    .from('employees')
    .select('id, full_name, employee_number, profile_id')
    .order('full_name')
  const employees = employeesData as Pick<
    Employee,
    'id' | 'full_name' | 'employee_number' | 'profile_id'
  >[] | null

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  )
  const employeeByProfileId = new Map(
    (employees ?? [])
      .filter((e) => e.profile_id)
      .map((e) => [e.profile_id!, e]),
  )

  const userRows = authUsers.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    last_sign_in_at: u.last_sign_in_at ?? null,
    created_at: u.created_at,
    // banned_until is returned by the API but not in the TS type
    banned: !!(((u as unknown) as Record<string, unknown>).banned_until),
    profile: (profileMap.get(u.id) as Profile) ?? null,
    linked_employee: employeeByProfileId.get(u.id) ?? null,
  }))

  return (
    <UsersClient
      userRows={userRows}
      employees={employees ?? []}
    />
  )
}
