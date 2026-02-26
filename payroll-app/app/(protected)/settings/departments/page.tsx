import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Department } from '@/types/database'
import DepartmentsClient from './DepartmentsClient'

export default async function DepartmentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if (profileData?.role !== 'owner') redirect('/dashboard')

  const { data: departments } = await admin
    .from('departments')
    .select('*')
    .order('type', { ascending: false })  // builtin first
    .order('name')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage departments available in employee profiles.
        </p>
      </div>

      <DepartmentsClient departments={(departments ?? []) as Department[]} />
    </div>
  )
}
