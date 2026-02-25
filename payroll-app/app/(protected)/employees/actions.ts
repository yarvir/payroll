'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPermission } from '@/lib/permissions'
import type { Profile, UserRole } from '@/types/database'

async function requireManagePermission() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const profile = profileData as Profile | null

  if (!profile) return null
  const allowed = await checkPermission(profile.role as UserRole, 'manage_employees')
  if (!allowed) return null
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

export async function updateEmployee(
  id: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const admin = await requireManagePermission()
  if (!admin) return { error: 'You do not have permission to edit employees.' }

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
  const hire_date = (formData.get('hire_date') as string | null) || null

  if (!employee_number || !full_name || !email) {
    return { error: 'Employee number, full name, and email are required.' }
  }

  const { error } = await admin
    .from('employees')
    .update({
      employee_number,
      full_name,
      email,
      position,
      department,
      group_id,
      status,
      hire_date,
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { error: 'An employee with this employee number or email already exists.' }
    }
    return { error: error.message }
  }

  revalidatePath('/employees')
  revalidatePath('/groups')
  return {}
}

export async function getNextEmployeeNumber(): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase.from('employees').select('employee_number')

  let max = 0
  for (const row of data ?? []) {
    const match = (row.employee_number as string).match(/^EMP-(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > max) max = num
    }
  }

  return `EMP-${String(max + 1).padStart(3, '0')}`
}
