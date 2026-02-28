'use client'

import { useState, useTransition, useEffect } from 'react'
import { createLoan } from './actions'

interface SimpleEmployee {
  id: string
  full_name: string
  employee_number: string
}

interface Props {
  /** Pre-filled when opened from the employee detail page. */
  employeeId?: string
  employeeName?: string
  /** Provide when opened from the loans page so the user can pick an employee. */
  employees?: SimpleEmployee[]
  onClose: () => void
  onSuccess: () => void
}

const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'HKD', 'SGD', 'AED', 'JPY', 'CAD', 'AUD']

export default function AddLoanModal({
  employeeId,
  employeeName,
  employees,
  onClose,
  onSuccess,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [totalAmount, setTotalAmount] = useState('')
  const [installments, setInstallments] = useState('')
  const [monthlyDeduction, setMonthlyDeduction] = useState<number | null>(null)

  // Recalculate monthly deduction whenever total or installments change
  useEffect(() => {
    const total = parseFloat(totalAmount)
    const n = parseInt(installments, 10)
    if (total > 0 && n >= 1) {
      setMonthlyDeduction(parseFloat((total / n).toFixed(2)))
    } else {
      setMonthlyDeduction(null)
    }
  }, [totalAmount, installments])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createLoan(formData)
      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-gray-900">Add Loan</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Employee */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Employee <span className="text-red-500">*</span>
            </label>
            {employeeId ? (
              <>
                <input type="hidden" name="employee_id" value={employeeId} />
                <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50">
                  {employeeName ?? employeeId}
                </div>
              </>
            ) : (
              <select
                name="employee_id"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Select employee…</option>
                {(employees ?? []).map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_number})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Currency + Total Amount side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Currency <span className="text-red-500">*</span>
              </label>
              <input
                name="currency"
                type="text"
                required
                placeholder="USD"
                list="currency-list"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
              />
              <datalist id="currency-list">
                {COMMON_CURRENCIES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Total Amount <span className="text-red-500">*</span>
              </label>
              <input
                name="total_amount"
                type="number"
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={totalAmount}
                onChange={e => setTotalAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Installments + Already Paid side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Number of Installments <span className="text-red-500">*</span>
              </label>
              <input
                name="number_of_installments"
                type="number"
                required
                min="1"
                step="1"
                placeholder="12"
                value={installments}
                onChange={e => setInstallments(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Installments Already Paid
              </label>
              <input
                name="already_paid"
                type="number"
                min="0"
                step="1"
                defaultValue="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Monthly deduction preview */}
          {monthlyDeduction !== null && (
            <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-lg">
              <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-indigo-700">
                Monthly deduction: <span className="font-semibold">{monthlyDeduction.toLocaleString()}</span>
              </span>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              name="start_date"
              type="date"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes / Reason</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Optional — e.g. personal loan, emergency advance…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {pending ? 'Creating…' : 'Create Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
