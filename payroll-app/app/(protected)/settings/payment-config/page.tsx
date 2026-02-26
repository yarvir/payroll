import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile } from '@/types/database'
import { getCompanySettings } from './actions'
import PaymentConfigClient from './PaymentConfigClient'

export default async function PaymentConfigPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('*').eq('id', user.id).single()
  const profile = data as Profile | null

  if (!profile || profile.role !== 'owner') redirect('/dashboard')

  const settings = await getCompanySettings()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Config</h1>
        <p className="mt-1 text-sm text-gray-500">
          Company bank accounts used when generating payroll payment files.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <PaymentConfigClient settings={settings} />
      </div>
    </div>
  )
}
