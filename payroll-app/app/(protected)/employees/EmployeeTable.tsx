'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { canManageEmployees } from '@/lib/roles'
import EditEmployeeModal from './EditEmployeeModal'
import type { Employee, EmployeeGroup, UserRole } from '@/types/database'

// ── Column definitions ────────────────────────────────────────────────────────

type ColumnId =
  | 'employee_number'
  | 'full_name'
  | 'email'
  | 'position'
  | 'department'
  | 'group'
  | 'status'
  | 'salary'
  | 'birthdate'
  | 'sensitive'

const ALL_COLUMNS: { id: ColumnId; label: string; sensitiveOnly?: boolean }[] = [
  { id: 'employee_number', label: 'Employee Number' },
  { id: 'full_name',       label: 'Full Name' },
  { id: 'email',           label: 'Email' },
  { id: 'position',        label: 'Position' },
  { id: 'department',      label: 'Department' },
  { id: 'group',           label: 'Group' },
  { id: 'status',          label: 'Status' },
  { id: 'salary',          label: 'Salary', sensitiveOnly: true },
  { id: 'birthdate',       label: 'Birthdate' },
  { id: 'sensitive',       label: 'Sensitive' },
]

const DEFAULT_COLUMNS: ColumnId[] = [
  'employee_number', 'full_name', 'position', 'group', 'status',
]

const LS_KEY = 'payroll_employee_columns'

// ── Supporting types ──────────────────────────────────────────────────────────

interface EmployeeWithGroup extends Employee {
  employee_groups: EmployeeGroup | null
}

interface EmployeeTableProps {
  employees: EmployeeWithGroup[]
  groups: EmployeeGroup[]
  viewSensitive: boolean
  userRole: UserRole
}

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

// ── Main component ────────────────────────────────────────────────────────────

export default function EmployeeTable({
  employees,
  groups,
  viewSensitive,
  userRole,
}: EmployeeTableProps) {
  const [search, setSearch] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showSensitiveOnly, setShowSensitiveOnly] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithGroup | null>(null)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(
    new Set(DEFAULT_COLUMNS),
  )
  const columnsRef = useRef<HTMLDivElement>(null)

  const canManage = canManageEmployees(userRole)

  // Load persisted column prefs on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as ColumnId[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVisibleColumns(new Set(parsed))
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!columnsOpen) return
    function onMouseDown(e: MouseEvent) {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) {
        setColumnsOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [columnsOpen])

  function toggleColumn(id: ColumnId) {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(Array.from(next)))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  const availableColumns = ALL_COLUMNS.filter(c => !c.sensitiveOnly || viewSensitive)

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch =
        !search ||
        emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_number.toLowerCase().includes(search.toLowerCase()) ||
        (emp.position ?? '').toLowerCase().includes(search.toLowerCase())

      const matchesGroup =
        selectedGroup === 'all' ||
        (selectedGroup === 'none' && !emp.group_id) ||
        emp.group_id === selectedGroup

      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter

      const matchesSensitive = !showSensitiveOnly || emp.is_sensitive

      return matchesSearch && matchesGroup && matchesStatus && matchesSensitive
    })
  }, [employees, search, selectedGroup, statusFilter, showSensitiveOnly])

  const groupedEmployees = useMemo(() => {
    const map = new Map<string, { group: EmployeeGroup | null; members: EmployeeWithGroup[] }>()

    filtered.forEach(emp => {
      const key = emp.group_id ?? '__ungrouped__'
      if (!map.has(key)) {
        map.set(key, { group: emp.employee_groups, members: [] })
      }
      map.get(key)!.members.push(emp)
    })

    const entries = Array.from(map.entries())
    entries.sort(([, a], [, b]) => {
      if (!a.group) return 1
      if (!b.group) return -1
      return a.group.name.localeCompare(b.group.name)
    })

    return entries
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Group filter */}
        <select
          value={selectedGroup}
          onChange={e => setSelectedGroup(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="all">All Groups</option>
          <option value="none">No Group</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_leave">On Leave</option>
        </select>

        {/* Sensitive toggle */}
        {viewSensitive && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <div
              onClick={() => setShowSensitiveOnly(v => !v)}
              className={`relative w-9 h-5 rounded-full transition ${showSensitiveOnly ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showSensitiveOnly ? 'translate-x-4' : ''}`} />
            </div>
            Sensitive only
          </label>
        )}

        {/* Columns button + dropdown */}
        <div ref={columnsRef} className="relative">
          <button
            onClick={() => setColumnsOpen(v => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition ${
              columnsOpen
                ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {/* columns / view-columns icon */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Columns
            <span className="min-w-[1.125rem] h-[1.125rem] rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium flex items-center justify-center px-1">
              {visibleColumns.size}
            </span>
          </button>

          {columnsOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 pt-1 pb-2">
                Visible columns
              </p>
              <div className="space-y-0.5">
                {availableColumns.map(col => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col.id)}
                      onChange={() => toggleColumn(col.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <span className="ml-auto text-sm text-gray-500">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grouped employee list */}
      {groupedEmployees.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-500 text-sm">No employees found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedEmployees.map(([key, { group, members }]) => (
            <div key={key} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Group header */}
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-sm font-semibold text-gray-700">
                  {group?.name ?? 'Ungrouped'}
                </span>
                {group?.description && (
                  <span className="text-xs text-gray-400">{group.description}</span>
                )}
                <span className="ml-auto text-xs text-gray-400">
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Employee rows */}
              <div className="divide-y divide-gray-100">
                {members.map(emp => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    viewSensitive={viewSensitive}
                    canManage={canManage}
                    cols={visibleColumns}
                    onEdit={setEditingEmployee}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          groups={groups}
          viewSensitive={viewSensitive}
          onClose={() => setEditingEmployee(null)}
        />
      )}
    </div>
  )
}

// ── Employee row ──────────────────────────────────────────────────────────────

function EmployeeRow({
  employee: emp,
  viewSensitive,
  canManage,
  cols,
  onEdit,
}: {
  employee: EmployeeWithGroup
  viewSensitive: boolean
  canManage: boolean
  cols: Set<ColumnId>
  onEdit: (emp: EmployeeWithGroup) => void
}) {
  const show = (id: ColumnId) => cols.has(id)

  return (
    <div className="group px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition">
      {/* Avatar — always shown */}
      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
        {emp.full_name.charAt(0).toUpperCase()}
      </div>

      {/* Identity block — always present to take up flex space */}
      <div className="flex-1 min-w-0">
        {show('full_name') && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">{emp.full_name}</span>
            {show('sensitive') && emp.is_sensitive && viewSensitive && (
              <SensitiveBadge />
            )}
          </div>
        )}
        {/* Sensitive badge standalone when name is hidden */}
        {!show('full_name') && show('sensitive') && emp.is_sensitive && viewSensitive && (
          <SensitiveBadge />
        )}
        {show('email') && (
          <p className="text-xs text-gray-400 truncate">{emp.email}</p>
        )}
      </div>

      {/* Employee number */}
      {show('employee_number') && (
        <span className="text-xs font-mono text-gray-400 hidden sm:block flex-shrink-0">
          {emp.employee_number}
        </span>
      )}

      {/* Position */}
      {show('position') && emp.position && (
        <span className="text-sm text-gray-500 hidden md:block flex-shrink-0 max-w-40 truncate">
          {emp.position}
        </span>
      )}

      {/* Department */}
      {show('department') && emp.department && (
        <span className="text-xs text-gray-500 hidden md:block flex-shrink-0 px-2 py-0.5 bg-gray-100 rounded-full">
          {emp.department}
        </span>
      )}

      {/* Group */}
      {show('group') && emp.employee_groups && (
        <span className="text-xs text-indigo-600 hidden md:block flex-shrink-0 px-2 py-0.5 bg-indigo-50 rounded-full">
          {emp.employee_groups.name}
        </span>
      )}

      {/* Birthdate — no DB column yet */}
      {show('birthdate') && (
        <span className="text-sm text-gray-300 hidden lg:block flex-shrink-0">—</span>
      )}

      {/* Salary */}
      {show('salary') && viewSensitive && (
        <span className="text-sm text-gray-700 font-medium hidden lg:block flex-shrink-0 w-24 text-right">
          {emp.salary != null
            ? new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              }).format(emp.salary)
            : <span className="text-gray-300">—</span>
          }
        </span>
      )}

      {/* Status */}
      {show('status') && (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[emp.status]}`}>
          {STATUS_LABELS[emp.status]}
        </span>
      )}

      {/* Edit button — visible on row hover for managers */}
      {canManage && (
        <button
          onClick={() => onEdit(emp)}
          title="Edit employee"
          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition opacity-0 group-hover:opacity-100 flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
    </div>
  )
}

function SensitiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-100 flex-shrink-0">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      Sensitive
    </span>
  )
}
