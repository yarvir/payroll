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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .substring(0, 50)
}

export async function createRole(formData: FormData): Promise<{ error?: string }> {
  const admin = await requireOwner()
  if (!admin) return { error: 'Only owners can manage roles.' }

  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { error: 'Role name is required.' }

  let id = slugify(name)
  if (!id) return { error: 'Role name must contain at least one letter or number.' }

  // Ensure ID is unique
  const { data: existing } = await admin.from('roles').select('id').eq('id', id).single()
  if (existing) {
    let suffix = 2
    while (true) {
      const candidate = `${id}_${suffix}`
      const { data: clash } = await admin.from('roles').select('id').eq('id', candidate).single()
      if (!clash) { id = candidate; break }
      suffix++
    }
  }

  const { error } = await admin.from('roles').insert({ id, name, is_default: false })
  if (error) {
    if (error.code === '23505') return { error: 'A role with this name already exists.' }
    return { error: error.message }
  }

  revalidatePath('/settings/roles')
  revalidatePath('/settings/permissions')
  return {}
}

export async function updateRole(id: string, formData: FormData): Promise<{ error?: string }> {
  const admin = await requireOwner()
  if (!admin) return { error: 'Only owners can manage roles.' }

  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { error: 'Role name is required.' }

  const { error } = await admin.from('roles').update({ name }).eq('id', id)
  if (error) {
    if (error.code === '23505') return { error: 'A role with this name already exists.' }
    return { error: error.message }
  }

  revalidatePath('/settings/roles')
  revalidatePath('/settings/permissions')
  return {}
}

export async function deleteRole(id: string): Promise<{ error?: string }> {
  const admin = await requireOwner()
  if (!admin) return { error: 'Only owners can manage roles.' }

  // Prevent deletion of built-in roles
  const { data: role } = await admin.from('roles').select('is_default').eq('id', id).single()
  if (role?.is_default) return { error: 'Built-in roles cannot be deleted.' }

  // Block deletion if any users currently have this role
  const { data: usersWithRole } = await admin
    .from('profiles')
    .select('id')
    .eq('role', id)
    .limit(1)
  if (usersWithRole && usersWithRole.length > 0) {
    return { error: 'Cannot delete a role that is assigned to users. Reassign those users first.' }
  }

  // Clean up permissions rows for this role
  await admin.from('role_permissions').delete().eq('role', id)

  const { error } = await admin.from('roles').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/settings/roles')
  revalidatePath('/settings/permissions')
  return {}
}
