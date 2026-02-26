'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile, CompanySettings } from '@/types/database'

async function requireOwner() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!data || (data as Pick<Profile, 'role'>).role !== 'owner') return null
  return admin
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('company_settings').select('*').eq('id', 1).single()
  return (data as CompanySettings | null)
}

export async function updateCompanySettings(
  ccbAccountNumber: string,
  hsbcHkAccountNumber: string,
): Promise<{ error?: string }> {
  const admin = await requireOwner()
  if (!admin) return { error: 'You do not have permission to update company settings.' }

  const { error } = await admin
    .from('company_settings')
    .upsert({
      id: 1,
      ccb_account_number: ccbAccountNumber.trim() || null,
      hsbc_hk_account_number: hsbcHkAccountNumber.trim() || null,
    })

  if (error) return { error: error.message }

  revalidatePath('/settings/payment-config')
  return {}
}
