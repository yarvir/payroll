'use client'

import { forwardRef, useImperativeHandle, useState } from 'react'
import type { PaymentMethodInput, PaymentMethodType } from '@/types/database'

export interface PaymentMethodsHandle {
  validate: () => string | null   // returns error message or null if valid
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
  deel_account_details: string
  beneficiary_name: string
  account_number: string
  branch: string
  swift_code: string
  bank_name: string
}

function emptyMethod(): MethodState {
  return {
    enabled: false,
    percentage: '',
    deel_account_details: '',
    beneficiary_name: '',
    account_number: '',
    branch: '',
    swift_code: '',
    bank_name: '',
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
        deel_account_details: m.deel_account_details ?? '',
        beneficiary_name: m.beneficiary_name ?? '',
        account_number: m.account_number ?? '',
        branch: m.branch ?? '',
        swift_code: m.swift_code ?? '',
        bank_name: m.bank_name ?? '',
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
          return null  // no payment methods configured — allowed
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
            if (!m.deel_account_details.trim()) {
              const msg = 'Deel account details are required.'
              setValidationError(msg)
              return msg
            }
          } else {
            if (!m.beneficiary_name.trim() || !m.account_number.trim()) {
              const msg = `Beneficiary name and account number are required for ${METHOD_LABELS[t]}.`
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
            base.deel_account_details = m.deel_account_details.trim() || null
          } else {
            base.beneficiary_name = m.beneficiary_name.trim() || null
            base.account_number = m.account_number.trim() || null
            base.branch = m.branch.trim() || null
            base.swift_code = m.swift_code.trim() || null
            if (t === 'non_ccb' || t === 'other') {
              base.bank_name = m.bank_name.trim() || null
            }
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
            Total: {totalPct}% {totalPct === 100 ? '✓' : `(must equal 100%)`}
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
                    {type === 'deel' ? (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Deel Account Details <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={m.deel_account_details}
                          onChange={(e) => setField(type, 'deel_account_details', e.target.value)}
                          rows={2}
                          placeholder="Deel account email or ID"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                      </div>
                    ) : (
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
                          <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
                          <input
                            type="text"
                            value={m.branch}
                            onChange={(e) => setField(type, 'branch', e.target.value)}
                            placeholder="Branch name or code"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        {(type === 'ccb' || type === 'hsbc') && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              SWIFT Code
                            </label>
                            <input
                              type="text"
                              value={m.swift_code}
                              onChange={(e) => setField(type, 'swift_code', e.target.value)}
                              placeholder="e.g. PCBCCNBJ"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        )}
                        {(type === 'non_ccb' || type === 'other') && (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Bank Name
                              </label>
                              <input
                                type="text"
                                value={m.bank_name}
                                onChange={(e) => setField(type, 'bank_name', e.target.value)}
                                placeholder="Bank name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                SWIFT Code
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
