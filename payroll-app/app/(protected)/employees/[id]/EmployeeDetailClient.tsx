'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import EditEmployeeModal from '../EditEmployeeModal'
import type { Employee, EmployeeGroup, Department, PaymentMethodInput } from '@/types/database'

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Employee['status'], string> = {
  active:   'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  on_leave: 'bg-yellow-100 text-yellow-800',
}

const STATUS_LABELS: Record<Employee['status'], string> = {
  active:   'Active',
  inactive: 'Inactive',
  on_leave: 'On Leave',
}

const METHOD_LABELS: Record<string, string> = {
  deel:    'Deel',
  ccb:     'CCB',
  non_ccb: 'Non-CCB Chinese Bank',
  hsbc:    'HSBC',
  other:   'Other Bank',
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'info' | 'bank' | 'contracts' | 'leave' | 'loans'

interface Props {
  employee: Employee & { employee_groups: EmployeeGroup | null }
  paymentMethods: PaymentMethodInput[]
  groups: EmployeeGroup[]
  departments: Department[]
  canManage: boolean
  viewSensitive: boolean
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EmployeeDetailClient({
  employee,
  paymentMethods,
  groups,
  departments,
  canManage,
  viewSensitive,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [editOpen, setEditOpen] = useState(false)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'info',      label: 'Info' },
    { id: 'bank',      label: 'Bank & Payment' },
    { id: 'contracts', label: 'Contracts' },
    { id: 'leave',     label: 'Leave' },
    { id: 'loans',     label: 'Loans' },
  ]

  function handleEditClose() {
    setEditOpen(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
        <Link
          href="/employees"
          className="text-indigo-600 hover:text-indigo-800 font-medium transition"
        >
          Employees
        </Link>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-600 truncate">{employee.full_name}</span>
      </nav>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl flex-shrink-0">
              {employee.full_name.charAt(0).toUpperCase()}
            </div>

            {/* Name + meta */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{employee.full_name}</h1>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[employee.status]}`}>
                  {STATUS_LABELS[employee.status]}
                </span>
                {employee.is_sensitive && viewSensitive && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-100 flex-shrink-0">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Sensitive
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-500">
                {employee.position && (
                  <span>{employee.position}</span>
                )}
                {employee.department && (
                  <span className="text-gray-400">{employee.department}</span>
                )}
                {employee.employee_groups && (
                  <span className="text-indigo-600">{employee.employee_groups.name}</span>
                )}
                <span className="font-mono text-gray-400">{employee.employee_number}</span>
              </div>
            </div>
          </div>

          {/* Edit button — managers only */}
          {canManage && (
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3.5 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div className="p-6">
          {activeTab === 'info' && (
            <InfoTab employee={employee} viewSensitive={viewSensitive} />
          )}
          {activeTab === 'bank' && (
            <BankTab paymentMethods={paymentMethods} />
          )}
          {activeTab === 'contracts' && (
            <PlaceholderTab label="Contracts" message="Contract history, active contract, benefits, and deductions are coming in Phase 3." />
          )}
          {activeTab === 'leave' && (
            <PlaceholderTab label="Leave" message="Leave management and tracking are coming in Phase 4." />
          )}
          {activeTab === 'loans' && (
            <PlaceholderTab label="Loans" message="Loans management is coming in Phase 5." />
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <EditEmployeeModal
          employee={employee}
          groups={groups}
          departments={departments}
          onClose={handleEditClose}
        />
      )}
    </div>
  )
}

// ── Info tab ──────────────────────────────────────────────────────────────────

function InfoTab({
  employee,
  viewSensitive,
}: {
  employee: Employee & { employee_groups: EmployeeGroup | null }
  viewSensitive: boolean
}) {
  const hireDate = employee.hire_date
    ? new Date(employee.hire_date).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null

  return (
    <div className="space-y-8">
      <InfoSection title="Basic Info">
        <Field label="Employee Number" value={employee.employee_number} mono />
        <Field label="Full Name"       value={employee.full_name} />
        <Field label="Email"           value={employee.email} />
        <Field label="Hire Date"       value={hireDate} />
        <Field label="Birthdate"       value={null} />
      </InfoSection>

      <InfoSection title="Job Details">
        <Field label="Position"   value={employee.position} />
        <Field label="Department" value={employee.department} />
        <Field label="Group"      value={employee.employee_groups?.name ?? null} />
        <Field label="Status"     value={STATUS_LABELS[employee.status]} />
        {viewSensitive && (
          <Field label="Sensitive" value={employee.is_sensitive ? 'Yes' : 'No'} />
        )}
      </InfoSection>
    </div>
  )
}

// ── Bank & Payment tab ────────────────────────────────────────────────────────

function BankTab({ paymentMethods }: { paymentMethods: PaymentMethodInput[] }) {
  if (paymentMethods.length === 0) {
    return (
      <div className="text-center py-14">
        <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <p className="text-gray-400 text-sm">No payment methods configured</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {paymentMethods.map((m, i) => (
        <div key={i} className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">{METHOD_LABELS[m.method_type] ?? m.method_type}</h4>
            <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              {m.percentage}%
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {m.deel_worker_id    && <Field label="Deel Worker ID"         value={m.deel_worker_id}    mono />}
            {m.chinese_name      && <Field label="Chinese Name (中文姓名)" value={m.chinese_name} />}
            {m.beneficiary_name  && <Field label="Beneficiary Name"       value={m.beneficiary_name} />}
            {m.account_number    && <Field label="Account Number"         value={m.account_number}    mono />}
            {m.branch            && <Field label="Branch / Branch Code"   value={m.branch} />}
            {m.bank_name         && <Field label="Bank Name"              value={m.bank_name} />}
            {m.bank_code         && <Field label="Bank Code"              value={m.bank_code}         mono />}
            {m.swift_code        && <Field label="SWIFT Code"             value={m.swift_code}        mono />}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Placeholder tab ───────────────────────────────────────────────────────────

function PlaceholderTab({ label, message }: { label: string; message: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-gray-700 font-medium">{label} — Coming Soon</p>
      <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">{message}</p>
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        {title}
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        {children}
      </dl>
    </div>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 mb-0.5">{label}</dt>
      <dd className={`text-sm ${mono ? 'font-mono' : ''} ${value ? 'text-gray-900' : 'text-gray-400'}`}>
        {value ?? '—'}
      </dd>
    </div>
  )
}
