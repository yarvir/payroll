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
  const allowed = await checkPermission(profile.role as UserRole, 'manage_groups')
  if (!allowed) return null
  return admin
}

export async function addGroup(formData: FormData): Promise<{ error?: string }> {
  const admin = await requireManagePermission()
  if (!admin) return { error: 'You do not have permission to manage groups.' }

  const name = (formData.get('name') as string | null)?.trim()
  const description = (formData.get('description') as string | null)?.trim() || null

  if (!name) return { error: 'Group name is required.' }

  const { error } = await admin.from('employee_groups').insert({ name, description })
  if (error) {
    if (error.code === '23505') return { error: 'A group with this name already exists.' }
    return { error: error.message }
  }

  revalidatePath('/groups')
  revalidatePath('/employees')
  return {}
}

export async function updateGroup(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  const admin = await requireManagePermission()
  if (!admin) return { error: 'You do not have permission to manage groups.' }

  const name = (formData.get('name') as string | null)?.trim()
  const description = (formData.get('description') as string | null)?.trim() || null

  if (!name) return { error: 'Group name is required.' }

  const { error } = await admin
    .from('employee_groups')
    .update({ name, description })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/groups')
  revalidatePath('/employees')
  return {}
}

export async function deleteGroup(id: string): Promise<{ error?: string }> {
  const admin = await requireManagePermission()
  if (!admin) return { error: 'You do not have permission to manage groups.' }

  const { error } = await admin.from('employee_groups').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/groups')
  revalidatePath('/employees')
  return {}
}
