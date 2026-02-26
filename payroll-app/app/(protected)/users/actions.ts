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

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  try {
    const admin = await requireOwner()
    if (!admin) return { error: 'Only owners can delete users.' }

    // Unlink any linked employee first
    await admin.from('employees').update({ profile_id: null }).eq('profile_id', userId)

    // Delete the profile row
    await admin.from('profiles').delete().eq('id', userId)

    // Delete the auth user
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return { error: error.message }

    revalidatePath('/users')
    revalidatePath('/employees')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An unexpected error occurred.' }
  }
}

export async function resetUserPassword(userId: string): Promise<{ error?: string }> {
  try {
    const admin = await requireOwner()
    if (!admin) return { error: 'Only owners can reset passwords.' }

    const { data: authUser, error: fetchError } = await admin.auth.admin.getUserById(userId)
    if (fetchError || !authUser?.user?.email) {
      return { error: fetchError?.message ?? 'User not found.' }
    }
    const email = authUser.user.email

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? 'https://payroll11000.vercel.app'
    const redirectTo = `${appUrl}/auth/callback?next=/auth/set-password`

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })
    if (linkError) return { error: linkError.message }

    const resetLink = (linkData as { properties?: { action_link?: string } })?.properties?.action_link
    if (!resetLink) return { error: 'Failed to generate reset link.' }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) return { error: 'Email service not configured (RESEND_API_KEY missing).' }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HR <hr@1000miles.biz>',
        to: [email],
        subject: 'Reset your payroll portal password',
        html: `
          <p>Hello,</p>
          <p>A password reset was requested for your account. Click the button below to set a new password:</p>
          <p style="margin: 24px 0;">
            <a href="${resetLink}"
               style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
              Reset Password
            </a>
          </p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break:break-all;color:#6B7280;">${resetLink}</p>
          <p style="color:#9CA3AF;font-size:13px;">
            This link expires in 24 hours. If you didn't request a password reset, you can safely ignore this email.
          </p>
        `,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string }
      return { error: body.message ?? 'Failed to send email via Resend.' }
    }

    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An unexpected error occurred.' }
  }
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
