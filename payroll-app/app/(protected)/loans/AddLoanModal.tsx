'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
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

const CURRENCIES = ['CNY', 'USD', 'PHP', 'ILS'] as const

const DEDUCTION_METHOD_LABELS: Record<string, string> = {
  salary:  'Salary — standard monthly deduction from payroll',
  bonus:   'Bonus — deducted from KPI or end-of-contract bonus only',
  flexible: 'Flexible — HR decides per installment',
}

export default function AddLoanModal({
  employeeId,
  employeeName,
  employees,
  onClose,
  onSuccess,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // ── Installment mode ──────────────────────────────────────────────────────
  const [installmentMode, setInstallmentMode] = useState<'equal' | 'custom'>('equal')

  // ── Shared fields ─────────────────────────────────────────────────────────
  const [currency, setCurrency] = useState<string>('CNY')
  const [totalAmount, setTotalAmount] = useState('')
  const [installments, setInstallments] = useState('')
  const [startDate, setStartDate] = useState('')

  // ── Equal mode ────────────────────────────────────────────────────────────
  const regularAmount = (() => {
    const total = parseFloat(totalAmount)
    const n = parseInt(installments, 10)
    if (total > 0 && n >= 1) return parseFloat((total / n).toFixed(2))
    return null
  })()
  const lastAmount = (() => {
    if (regularAmount === null) return null
    const n = parseInt(installments, 10)
    return parseFloat((parseFloat(totalAmount) - regularAmount * (n - 1)).toFixed(2))
  })()

  // ── Custom mode ───────────────────────────────────────────────────────────
  const [customAmounts, setCustomAmounts] = useState<string[]>([])

  // Sync customAmounts array length with installments count
  useEffect(() => {
    const n = parseInt(installments, 10)
    if (isNaN(n) || n < 1) return
    const total = parseFloat(totalAmount)
    setCustomAmounts(prev => {
      const next = Array.from({ length: n }, (_, i) => prev[i] ?? '')
      // Pre-fill last slot with remaining balance as a helper
      if (total > 0) {
        const sumOfOthers = next.slice(0, -1).reduce((s, v) => s + (parseFloat(v) || 0), 0)
        const remaining = parseFloat((total - sumOfOthers).toFixed(2))
        next[n - 1] = remaining >= 0 ? String(remaining) : ''
      }
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installments])

  // When switching to custom mode, initialize from equal amounts
  function handleModeSwitch(mode: 'equal' | 'custom') {
    if (mode === 'custom' && installmentMode === 'equal') {
      const n = parseInt(installments, 10)
      const total = parseFloat(totalAmount)
      if (!isNaN(n) && n >= 1 && total > 0) {
        const reg = parseFloat((total / n).toFixed(2))
        const last = parseFloat((total - reg * (n - 1)).toFixed(2))
        setCustomAmounts(Array.from({ length: n }, (_, i) =>
          i === n - 1 ? String(last) : String(reg)
        ))
      }
    }
    setInstallmentMode(mode)
  }

  function updateCustomAmount(index: number, value: string) {
    setCustomAmounts(prev => {
      const next = [...prev]
      next[index] = value
      // Auto-update last slot with remaining balance
      const n = next.length
      const total = parseFloat(totalAmount)
      if (total > 0 && index < n - 1) {
        const sumOfOthers = next.slice(0, -1).reduce((s, v) => s + (parseFloat(v) || 0), 0)
        const remaining = parseFloat((total - sumOfOthers).toFixed(2))
        next[n - 1] = remaining >= 0 ? String(remaining) : ''
      }
      return next
    })
  }

  const customTotal = customAmounts.reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const customRemaining = parseFloat(totalAmount) - customTotal
  const customValid = Math.abs(customRemaining) <= 0.01 &&
    customAmounts.every(v => v !== '' && !isNaN(parseFloat(v)) && parseFloat(v) >= 0)

  // ── Due dates for custom table ─────────────────────────────────────────────
  function getDueDate(index: number): string {
    if (!startDate) return '—'
    const d = new Date(startDate + 'T00:00:00')
    d.setMonth(d.getMonth() + index)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // ── Form refs ─────────────────────────────────────────────────────────────
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    // Inject custom amounts into FormData manually so they appear in correct order
    if (installmentMode === 'custom') {
      formData.delete('custom_amounts')
      customAmounts.forEach(v => formData.append('custom_amounts', v))
    }
    startTransition(async () => {
      const result = await createLoan(formData)
      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
      }
    })
  }

  const canSubmit = installmentMode === 'equal' ? true : customValid

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
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
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Hidden installment_mode field */}
          <input type="hidden" name="installment_mode" value={installmentMode} />

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

          {/* Installment mode toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Installment Amounts <span className="text-red-500">*</span>
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium">
              {(['equal', 'custom'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleModeSwitch(mode)}
                  className={`flex-1 py-2 transition ${
                    installmentMode === mode
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {mode === 'equal' ? 'Equal installments' : 'Custom installments'}
                </button>
              ))}
            </div>
          </div>

          {/* Currency + Total Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Currency <span className="text-red-500">*</span>
              </label>
              <select
                name="currency"
                required
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
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

          {/* Number of Installments + Start Date */}
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
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                name="start_date"
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Equal mode: deduction preview */}
          {installmentMode === 'equal' && regularAmount !== null && (
            <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-lg">
              <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-indigo-700">
                {parseInt(installments, 10) > 1
                  ? <>
                      {parseInt(installments, 10) - 1} × {currency} <strong>{regularAmount.toLocaleString()}</strong>
                      {' '}+ last: {currency} <strong>{lastAmount?.toLocaleString()}</strong>
                    </>
                  : <>
                      1 installment: {currency} <strong>{regularAmount.toLocaleString()}</strong>
                    </>
                }
              </span>
            </div>
          )}

          {/* Custom mode: installment amount table */}
          {installmentMode === 'custom' && parseInt(installments, 10) >= 1 && (
            <div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Amount ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Array.from({ length: parseInt(installments, 10) }, (_, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 text-gray-500 text-xs">{i + 1}</td>
                        <td className="px-3 py-1.5 text-gray-500 text-xs whitespace-nowrap">{getDueDate(i)}</td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={customAmounts[i] ?? ''}
                            onChange={e => updateCustomAmount(i, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Running total */}
              <div className={`mt-2 flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                customValid ? 'bg-green-50 border border-green-200 text-green-700' :
                customRemaining < 0 ? 'bg-red-50 border border-red-200 text-red-700' :
                'bg-amber-50 border border-amber-200 text-amber-700'
              }`}>
                <span>Entered: <strong>{customTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                <span>Total: <strong>{parseFloat(totalAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                <span>Remaining: <strong>{customRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
              </div>
            </div>
          )}

          {/* Installments Already Paid */}
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
            <p className="mt-1 text-xs text-gray-400">First N installments will be marked paid (source: Manual).</p>
          </div>

          {/* Deduction Method */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Deduction Method <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {(['salary', 'bonus', 'flexible'] as const).map(method => (
                <label key={method} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="deduction_method"
                    value={method}
                    defaultChecked={method === 'salary'}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{DEDUCTION_METHOD_LABELS[method]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Contract */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contract (optional)</p>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Upload PDF</label>
              <input
                name="contract_file"
                type="file"
                accept=".pdf,application/pdf"
                className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">External link (PandaDoc, Google Drive…)</label>
              <input
                name="contract_url"
                type="url"
                placeholder="https://…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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
              disabled={pending || !canSubmit}
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
