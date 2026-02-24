'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile, UserRole } from '@/types/database'

async function requireOwner() {
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

  if (!profile || profile.role !== 'owner') return null
  return admin
}

export async function inviteUser(formData: FormData): Promise<{ error?: string }> {
  const admin = await requireOwner()
  if (!admin) return { error: 'Only owners can invite users.' }

  const email = (formData.get('email') as string | null)?.trim()
  const role = (formData.get('role') as string | null) as UserRole | null
  const employee_id = (formData.get('employee_id') as string | null) || null

  if (!email || !role) return { error: 'Email and role are required.' }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://payroll11000.vercel.app'
  const redirectTo = `${appUrl}/auth/callback?next=/auth/set-password`

  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { role } })

  if (inviteError) {
    if (inviteError.message.toLowerCase().includes('already registered')) {
      return { error: 'A user with this email already exists.' }
    }
    return { error: inviteError.message }
  }

  const userId = inviteData.user.id

  const { error: profileError } = await admin.from('profiles').upsert(
    { id: userId, email, role, full_name: null },
    { onConflict: 'id', ignoreDuplicates: false }
  )

  if (profileError) {
    await admin.auth.admin.deleteUser(userId)
    return { error: profileError.message }
  }

  if (employee_id) {
    await admin
      .from('employees')
      .update({ profile_id: userId })
      .eq('id', employee_id)
  }

  revalidatePath('/users')
  return {}
}

export async function updateUser(
  userId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const admin = await requireOwner()
  if (!admin) return { error: 'Only owners can manage users.' }

  const role = (formData.get('role') as string | null) as UserRole | null
  const employee_id = (formData.get('employee_id') as string | null) || null

  if (!role) return { error: 'Role is required.' }

  // Find currently linked employee so we can unlink if needed
  const { data: currentEmployee } = await admin
    .from('employees')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle()

  const { error: profileError } = await admin
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (profileError) return { error: profileError.message }

  // Unlink old employee if it changed
  if (currentEmployee && currentEmployee.id !== employee_id) {
    await admin
      .from('employees')
      .update({ profile_id: null })
      .eq('id', currentEmployee.id)
  }

  // Link new employee
  if (employee_id) {
    await admin
      .from('employees')
      .update({ profile_id: userId })
      .eq('id', employee_id)
  }

  revalidatePath('/users')
  revalidatePath('/employees')
  return {}
}

export async function deactivateUser(userId: string): Promise<{ error?: string }> {
  try {
    const admin = await requireOwner()
    if (!admin) return { error: 'Only owners can deactivate users.' }

    const { error } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: '87600h',
    })
    if (error) return { error: error.message }

    revalidatePath('/users')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An unexpected error occurred.' }
  }
}

export async function reactivateUser(userId: string): Promise<{ error?: string }> {
  try {
    const admin = await requireOwner()
    if (!admin) return { error: 'Only owners can reactivate users.' }

    const { error } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: 'none',
    })
    if (error) return { error: error.message }

    revalidatePath('/users')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An unexpected error occurred.' }
  }
}
