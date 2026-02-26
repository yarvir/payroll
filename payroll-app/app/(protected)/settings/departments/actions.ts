'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireOwner() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'owner') return null
  return admin
}

export async function createDepartment(formData: FormData): Promise<{ error?: string }> {
  const admin = await requireOwner()
  if (!admin) return { error: 'Only owners can manage departments.' }

  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { error: 'Department name is required.' }

  const { error } = await admin
    .from('departments')
    .insert({ name, type: 'custom' })

  if (error) {
    if (error.code === '23505') return { error: 'A department with this name already exists.' }
    return { error: error.message }
  }

  revalidatePath('/settings/departments')
  return {}
}

export async function updateDepartment(
  id: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const admin = await requireOwner()
  if (!admin) return { error: 'Only owners can manage departments.' }

  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { error: 'Department name is required.' }

  const { error } = await admin
    .from('departments')
    .update({ name })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') return { error: 'A department with this name already exists.' }
    return { error: error.message }
  }

  revalidatePath('/settings/departments')
  return {}
}

export async function deleteDepartment(id: string): Promise<{ error?: string }> {
  const admin = await requireOwner()
  if (!admin) return { error: 'Only owners can manage departments.' }

  // Block deletion of builtin departments
  const { data: dept } = await admin
    .from('departments')
    .select('type, name')
    .eq('id', id)
    .single()

  if (!dept) return { error: 'Department not found.' }
  if (dept.type === 'builtin') return { error: 'Built-in departments cannot be deleted.' }

  // Block deletion if any employees are assigned to this department
  const { data: assigned } = await admin
    .from('employees')
    .select('id')
    .eq('department', dept.name)
    .limit(1)

  if (assigned && assigned.length > 0) {
    return { error: 'Cannot delete a department that has employees assigned. Reassign those employees first.' }
  }

  const { error } = await admin.from('departments').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/settings/departments')
  return {}
}
