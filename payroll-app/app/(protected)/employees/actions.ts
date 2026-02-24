'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canManageEmployees } from '@/lib/roles'
import type { UserRole } from '@/types/database'

async function requireManagePermission() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !canManageEmployees(profile.role as UserRole)) return null
  return admin
}

export async function addEmployee(formData: FormData): Promise<{ error?: string }> {
  const admin = await requireManagePermission()
  if (!admin) return { error: 'You do not have permission to add employees.' }

  const employee_number = (formData.get('employee_number') as string | null)?.trim()
  const full_name = (formData.get('full_name') as string | null)?.trim()
  const email = (formData.get('email') as string | null)?.trim()
  const position = (formData.get('position') as string | null)?.trim() || null
  const department = (formData.get('department') as string | null)?.trim() || null
  const group_id = (formData.get('group_id') as string | null) || null
  const status =
    ((formData.get('status') as string | null) || 'active') as
      | 'active'
      | 'inactive'
      | 'on_leave'
  const salary_raw = formData.get('salary') as string | null
  const salary = salary_raw && salary_raw.trim() !== '' ? parseFloat(salary_raw) : null
  const is_sensitive = formData.get('is_sensitive') === 'on'
  const hire_date = (formData.get('hire_date') as string | null) || null

  if (!employee_number || !full_name || !email) {
    return { error: 'Employee number, full name, and email are required.' }
  }

  const { error } = await admin.from('employees').insert({
    employee_number,
    full_name,
    email,
    position,
    department,
    group_id,
    status,
    salary,
    is_sensitive,
    hire_date,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'An employee with this employee number or email already exists.' }
    }
    return { error: error.message }
  }

  revalidatePath('/employees')
  return {}
}
