'use client'

import { forwardRef, useImperativeHandle, useState } from 'react'
import type { PaymentMethodInput, PaymentMethodType } from '@/types/database'

export interface PaymentMethodsHandle {
  validate: () => string | null
  getPaymentMethods: () => PaymentMethodInput[]
}

const METHOD_LABELS: Record<PaymentMethodType, string> = {
  deel: 'Deel',
  ccb: 'CCB',
  non_ccb: 'Non-CCB Chinese Bank',
  hsbc: 'HSBC',
  other: 'Other Bank',
}

const ALL_METHODS: PaymentMethodType[] = ['deel', 'ccb', 'non_ccb', 'hsbc', 'other']

type MethodState = {
  enabled: boolean
  percentage: string
  // Deel
  deel_worker_id: string
  // CCB
  chinese_name: string
  // Shared bank fields
  beneficiary_name: string
  account_number: string
  branch: string       // used as branch code (联行号) for non_ccb, branch for other
  swift_code: string   // other only
  bank_name: string    // hsbc, other
  bank_code: string    // hsbc
}

function emptyMethod(): MethodState {
  return {
    enabled: false,
    percentage: '',
    deel_worker_id: '',
    chinese_name: '',
    beneficiary_name: '',
    account_number: '',
    branch: '',
    swift_code: '',
    bank_name: '',
    bank_code: '',
  }
}

function initFromData(initialData?: PaymentMethodInput[]): Record<PaymentMethodType, MethodState> {
  const state: Record<string, MethodState> = {}
  for (const t of ALL_METHODS) {
    state[t] = emptyMethod()
  }
  if (initialData) {
    for (const m of initialData) {
      state[m.method_type] = {
        enabled: true,
        percentage: String(m.percentage),
        deel_worker_id: m.deel_worker_id ?? '',
        chinese_name: m.chinese_name ?? '',
        beneficiary_name: m.beneficiary_name ?? '',
        account_number: m.account_number ?? '',
        branch: m.branch ?? '',
        swift_code: m.swift_code ?? '',
        bank_name: m.bank_name ?? '',
        bank_code: m.bank_code ?? '',
      }
    }
  }
  return state as Record<PaymentMethodType, MethodState>
}

interface Props {
  initialData?: PaymentMethodInput[]
}

const PaymentMethodsSection = forwardRef<PaymentMethodsHandle, Props>(
  function PaymentMethodsSection({ initialData }, ref) {
    const [methods, setMethods] = useState<Record<PaymentMethodType, MethodState>>(
      () => initFromData(initialData),
    )
    const [validationError, setValidationError] = useState<string | null>(null)

    useImperativeHandle(ref, () => ({
      validate() {
        const enabled = ALL_METHODS.filter((t) => methods[t].enabled)
        if (enabled.length === 0) {
          setValidationError(null)
          return null
        }
        const total = enabled.reduce((sum, t) => {
          const pct = parseInt(methods[t].percentage, 10)
          return sum + (isNaN(pct) ? 0 : pct)
        }, 0)
        if (total !== 100) {
          const msg = `Payment method percentages must sum to 100% (currently ${total}%).`
          setValidationError(msg)
          return msg
        }
        for (const t of enabled) {
          const m = methods[t]
          if (t === 'deel') {
            if (!m.deel_worker_id.trim()) {
              const msg = 'Deel Worker ID is required.'
              setValidationError(msg)
              return msg
            }
          } else if (t === 'ccb') {
            if (!m.chinese_name.trim() || !m.account_number.trim()) {
              const msg = 'Chinese Name and Account Number are required for CCB.'
              setValidationError(msg)
              return msg
            }
          } else {
            if (!m.beneficiary_name.trim() || !m.account_number.trim()) {
              const msg = `Beneficiary Name and Account Number are required for ${METHOD_LABELS[t]}.`
              setValidationError(msg)
              return msg
            }
          }
        }
        setValidationError(null)
        return null
      },
      getPaymentMethods() {
        return ALL_METHODS.filter((t) => methods[t].enabled).map((t) => {
          const m = methods[t]
          const base: PaymentMethodInput = {
            method_type: t,
            percentage: parseInt(m.percentage, 10) || 0,
          }
          if (t === 'deel') {
            base.deel_worker_id = m.deel_worker_id.trim() || null
          } else if (t === 'ccb') {
            base.chinese_name = m.chinese_name.trim() || null
            base.account_number = m.account_number.trim() || null
          } else if (t === 'non_ccb') {
            base.beneficiary_name = m.beneficiary_name.trim() || null
            base.account_number = m.account_number.trim() || null
            base.branch = m.branch.trim() || null
          } else if (t === 'hsbc') {
            base.beneficiary_name = m.beneficiary_name.trim() || null
            base.account_number = m.account_number.trim() || null
            base.bank_name = m.bank_name.trim() || null
            base.bank_code = m.bank_code.trim() || null
          } else {
            // other
            base.beneficiary_name = m.beneficiary_name.trim() || null
            base.account_number = m.account_number.trim() || null
            base.branch = m.branch.trim() || null
            base.swift_code = m.swift_code.trim() || null
            base.bank_name = m.bank_name.trim() || null
          }
          return base
        })
      },
    }))

    function setField(type: PaymentMethodType, field: keyof MethodState, value: string | boolean) {
      setMethods((prev) => ({
        ...prev,
        [type]: { ...prev[type], [field]: value },
      }))
      setValidationError(null)
    }

    const enabledCount = ALL_METHODS.filter((t) => methods[t].enabled).length
    const totalPct = ALL_METHODS.filter((t) => methods[t].enabled).reduce((sum, t) => {
      const v = parseInt(methods[t].percentage, 10)
      return sum + (isNaN(v) ? 0 : v)
    }, 0)

    return (
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Payment &amp; Bank Details
        </h3>

        {validationError && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {validationError}
          </div>
        )}

        {enabledCount > 1 && (
          <div
            className={`mb-3 px-3 py-2 rounded-lg text-sm font-medium ${
              totalPct === 100
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}
          >
            Total: {totalPct}% {totalPct === 100 ? '✓' : '(must equal 100%)'}
          </div>
        )}

        <div className="space-y-4">
          {ALL_METHODS.map((type) => {
            const m = methods[type]
            return (
              <div
                key={type}
                className={`rounded-xl border transition ${
                  m.enabled ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200 bg-white'
                }`}
              >
                {/* Method header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    id={`pm-${type}`}
                    checked={m.enabled}
                    onChange={(e) => setField(type, 'enabled', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor={`pm-${type}`}
                    className="flex-1 text-sm font-medium text-gray-800 cursor-pointer select-none"
                  >
                    {METHOD_LABELS[type]}
                  </label>
                  {m.enabled && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={m.percentage}
                        onChange={(e) => setField(type, 'percentage', e.target.value)}
                        placeholder="100"
                        className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  )}
                </div>

                {/* Method detail fields */}
                {m.enabled && (
                  <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-indigo-100 pt-3">

                    {/* ── Deel ── */}
                    {type === 'deel' && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Deel Worker ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={m.deel_worker_id}
                          onChange={(e) => setField(type, 'deel_worker_id', e.target.value)}
                          placeholder="Numeric ID from Deel profile → General Information → Worker ID"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    {/* ── CCB ── */}
                    {type === 'ccb' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Chinese Name (中文姓名) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={m.chinese_name}
                            onChange={(e) => setField(type, 'chinese_name', e.target.value)}
                            placeholder="如：张三"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <p className="mt-1 text-xs text-amber-600">Name must be in Chinese characters</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Account Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={m.account_number}
                            onChange={(e) => setField(type, 'account_number', e.target.value)}
                            placeholder="CCB account number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </>
                    )}

                    {/* ── Non-CCB Chinese Bank ── */}
                    {type === 'non_ccb' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Beneficiary Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={m.beneficiary_name}
                            onChange={(e) => setField(type, 'beneficiary_name', e.target.value)}
                            placeholder="Full legal name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Account Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={m.account_number}
                            onChange={(e) => setField(type, 'account_number', e.target.value)}
                            placeholder="Account number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Branch Code (联行号)
                          </label>
                          <input
                            type="text"
                            value={m.branch}
                            onChange={(e) => setField(type, 'branch', e.target.value)}
                            placeholder="12-digit branch code"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </>
                    )}

                    {/* ── HSBC ── */}
                    {type === 'hsbc' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Beneficiary Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={m.beneficiary_name}
                            onChange={(e) => setField(type, 'beneficiary_name', e.target.value)}
                            placeholder="Full legal name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Account Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={m.account_number}
                            onChange={(e) => setField(type, 'account_number', e.target.value)}
                            placeholder="HSBC HK account number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            value={m.bank_name}
                            onChange={(e) => setField(type, 'bank_name', e.target.value)}
                            placeholder="e.g. HSBC Hong Kong"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Bank Code
                          </label>
                          <input
                            type="text"
                            value={m.bank_code}
                            onChange={(e) => setField(type, 'bank_code', e.target.value)}
                            placeholder="e.g. 004"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </>
                    )}

                    {/* ── Other Bank ── */}
                    {type === 'other' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Beneficiary Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={m.beneficiary_name}
                            onChange={(e) => setField(type, 'beneficiary_name', e.target.value)}
                            placeholder="Full legal name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Account Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={m.account_number}
                            onChange={(e) => setField(type, 'account_number', e.target.value)}
                            placeholder="Account number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                          <input
                            type="text"
                            value={m.bank_name}
                            onChange={(e) => setField(type, 'bank_name', e.target.value)}
                            placeholder="Bank name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
                          <input
                            type="text"
                            value={m.branch}
                            onChange={(e) => setField(type, 'branch', e.target.value)}
                            placeholder="Branch name or code"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            SWIFT Code (optional)
                          </label>
                          <input
                            type="text"
                            value={m.swift_code}
                            onChange={(e) => setField(type, 'swift_code', e.target.value)}
                            placeholder="SWIFT / BIC"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </>
                    )}

                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="mt-2 text-xs text-gray-400">
          Enable one or more payment methods. Percentages must total 100% when multiple are selected.
        </p>
      </section>
    )
  },
)

export default PaymentMethodsSection
