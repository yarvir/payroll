'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AddLoanModal from './AddLoanModal'
import type { LoanWithEmployee } from './actions'
import type { EmployeeGroup } from '@/types/database'

interface SimpleEmployee {
  id: string
  full_name: string
  employee_number: string
}

interface Props {
  loans: LoanWithEmployee[]
  groups: EmployeeGroup[]
  employees: SimpleEmployee[]
  canManage: boolean
}

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-blue-100 text-blue-800',
  paid:      'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  active:    'Active',
  paid:      'Paid',
  cancelled: 'Cancelled',
}

const DEDUCTION_LABELS: Record<string, string> = {
  salary:   'Salary',
  bonus:    'Bonus',
  flexible: 'Flexible',
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function LoansClient({ loans, groups, employees, canManage }: Props) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [showAddLoan, setShowAddLoan] = useState(false)

  const filtered = loans.filter(loan => {
    if (statusFilter !== 'all' && loan.status !== statusFilter) return false
    if (groupFilter !== 'all' && loan.employees?.group_id !== groupFilter) return false
    return true
  })

  function goToEmployeeLoans(employeeId: string) {
    router.push(`/employees/${employeeId}?tab=loans`)
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">All Groups</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* Add Loan button — owner/hr only */}
        {canManage && (
          <button
            onClick={() => setShowAddLoan(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Loan
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
            <p className="text-gray-400 text-sm">No loans found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Group</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">CCY</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Installments</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Remaining</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deduction</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(loan => {
                  const paidAmount = loan.loan_installments
                    .filter(i => i.status === 'paid')
                    .reduce((sum, i) => sum + i.amount, 0)
                  const remaining = Math.max(0, loan.total_amount - paidAmount)
                  const paidCount = loan.loan_installments.filter(i => i.status === 'paid').length
                  return (
                    <tr
                      key={loan.id}
                      onClick={() => loan.employees && goToEmployeeLoans(loan.employees.id)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {loan.employees?.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {loan.employees?.employee_groups?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium font-mono">
                        {fmt(loan.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {loan.currency}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {paidCount}/{loan.number_of_installments}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        {fmt(remaining)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(loan.start_date + 'T00:00:00').toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {DEDUCTION_LABELS[loan.deduction_method] ?? loan.deduction_method}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[loan.status] ?? ''}`}>
                          {STATUS_LABELS[loan.status] ?? loan.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddLoan && (
        <AddLoanModal
          employees={employees}
          onClose={() => setShowAddLoan(false)}
          onSuccess={() => {
            setShowAddLoan(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
