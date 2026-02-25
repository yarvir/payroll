'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
async function requireOwner() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileData?.role !== 'owner') return null
  return admin
}

export async function updatePermission(
  feature: string,
  role: string,
  enabled: boolean
): Promise<{ error?: string }> {
  const admin = await requireOwner()
  if (!admin) return { error: 'Only owners can manage permissions.' }

  const { error } = await admin
    .from('role_permissions')
    .upsert({ feature, role, enabled }, { onConflict: 'feature,role' })

  if (error) return { error: error.message }

  revalidatePath('/settings/permissions')
  return {}
}
