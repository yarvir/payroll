'use client'

import { useState, useTransition } from 'react'
import { updateCompanySettings } from './actions'
import type { CompanySettings } from '@/types/database'

interface Props {
  settings: CompanySettings | null
}

export default function PaymentConfigClient({ settings }: Props) {
  const [ccb, setCcb] = useState(settings?.ccb_account_number ?? '')
  const [hsbc, setHsbc] = useState(settings?.hsbc_hk_account_number ?? '')
  const [pending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await updateCompanySettings(ccb, hsbc)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          Settings saved successfully.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company CCB Account Number
        </label>
        <input
          type="text"
          value={ccb}
          onChange={(e) => { setCcb(e.target.value); setSuccess(false) }}
          placeholder="e.g. 6217000000000000000"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-400">Used as the payer account in all CCB bank file exports.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company HSBC HK Account Number
        </label>
        <input
          type="text"
          value={hsbc}
          onChange={(e) => { setHsbc(e.target.value); setSuccess(false) }}
          placeholder="e.g. 004-123456-001"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-400">Used for HSBC and Deel payments.</p>
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {pending ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}
