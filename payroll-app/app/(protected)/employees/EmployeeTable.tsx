'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import ExcelJS from 'exceljs'
import { canManageEmployees } from '@/lib/roles'
import EditEmployeeModal from './EditEmployeeModal'
import type { Employee, EmployeeGroup } from '@/types/database'

// ── Column definitions ────────────────────────────────────────────────────────

type ColumnId =
  | 'employee_number'
  | 'full_name'
  | 'email'
  | 'position'
  | 'department'
  | 'group'
  | 'status'
  | 'birthdate'
  | 'sensitive'

const ALL_COLUMNS: { id: ColumnId; label: string }[] = [
  { id: 'employee_number', label: 'Employee Number' },
  { id: 'full_name',       label: 'Full Name' },
  { id: 'email',           label: 'Email' },
  { id: 'position',        label: 'Position' },
  { id: 'department',      label: 'Department' },
  { id: 'group',           label: 'Group' },
  { id: 'status',          label: 'Status' },
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
  viewSensitive: boolean  // can see sensitive employee records + badge (owner, hr, accountant)
  userRole: string
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
  const [exporting, setExporting] = useState(false)
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

  const availableColumns = ALL_COLUMNS

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

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    try {
      // ── Palette (ARGB) ────────────────────────────────────────────────────
      const NAVY    = 'FF1F3864'   // dark navy  — title bars, totals row
      const DKBLUE  = 'FF2E4A7A'   // medium navy — section headers
      const HDRBLUE = 'FF4472C4'   // cornflower  — column header rows
      const ALTBLUE = 'FFDCE6F1'   // pale blue   — alternating data rows
      const WHITE   = 'FFFFFFFF'
      const DKTEXT  = 'FF1F1F1F'
      const LTTEXT  = 'FFFFFFFF'
      const BDRCLR  = 'FFB8CCE4'   // soft blue border

      const thin: ExcelJS.Border = { style: 'thin', color: { argb: BDRCLR } }
      const allBorders: Partial<ExcelJS.Borders> = { top: thin, left: thin, bottom: thin, right: thin }

      const solidFill = (argb: string): ExcelJS.Fill =>
        ({ type: 'pattern', pattern: 'solid', fgColor: { argb } }) as ExcelJS.Fill
      const arial = (opts: Partial<ExcelJS.Font>): Partial<ExcelJS.Font> =>
        ({ name: 'Arial', ...opts })

      // ── Reusable row builders ─────────────────────────────────────────────

      const addTitleRow = (ws: ExcelJS.Worksheet, text: string, colCount: number) => {
        const row = ws.addRow([text])
        row.height = 32
        for (let c = 1; c <= colCount; c++) {
          const cell = row.getCell(c)
          cell.fill = solidFill(NAVY)
          cell.border = allBorders
          if (c === 1) {
            cell.font = arial({ bold: true, size: 14, color: { argb: LTTEXT } })
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
          }
        }
        if (colCount > 1) ws.mergeCells(row.number, 1, row.number, colCount)
      }

      const addSectionRow = (ws: ExcelJS.Worksheet, name: string, count: number, colCount: number) => {
        const label = `${name}   (${count} member${count !== 1 ? 's' : ''})`
        const row = ws.addRow([label])
        row.height = 22
        for (let c = 1; c <= colCount; c++) {
          const cell = row.getCell(c)
          cell.fill = solidFill(DKBLUE)
          cell.border = allBorders
          if (c === 1) {
            cell.font = arial({ bold: true, size: 11, color: { argb: LTTEXT } })
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
          }
        }
        if (colCount > 1) ws.mergeCells(row.number, 1, row.number, colCount)
      }

      const addHeaderRow = (ws: ExcelJS.Worksheet, labels: string[]) => {
        const row = ws.addRow(labels)
        row.height = 18
        for (let c = 1; c <= labels.length; c++) {
          const cell = row.getCell(c)
          cell.font = arial({ bold: true, size: 10, color: { argb: LTTEXT } })
          cell.fill = solidFill(HDRBLUE)
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
          cell.border = allBorders
        }
      }

      const addDataRow = (
        ws: ExcelJS.Worksheet,
        values: (string | null)[],
        isAlt: boolean,
        statusColIdx: number,
      ) => {
        const row = ws.addRow(values)
        row.height = 16
        const bg = isAlt ? ALTBLUE : WHITE
        for (let c = 1; c <= values.length; c++) {
          const cell = row.getCell(c)
          cell.font = arial({ size: 10, color: { argb: DKTEXT } })
          cell.fill = solidFill(bg)
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
          cell.border = allBorders
          // Colour-coded status cell
          if (c === statusColIdx) {
            const s = cell.value as string
            if (s === 'Active') {
              cell.font = arial({ bold: true, size: 10, color: { argb: 'FF375623' } })
              cell.fill = solidFill('FFE2EFDA')
            } else if (s === 'Inactive') {
              cell.font = arial({ bold: true, size: 10, color: { argb: 'FFC00000' } })
              cell.fill = solidFill('FFFCE4D6')
            } else if (s === 'On Leave') {
              cell.font = arial({ bold: true, size: 10, color: { argb: 'FF9C5700' } })
              cell.fill = solidFill('FFFFF2CC')
            }
          }
        }
      }

      // ── Workbook ──────────────────────────────────────────────────────────
      const wb = new ExcelJS.Workbook()
      wb.creator = 'Payroll'

      const EMP_COLS = ['Employee Number', 'Full Name', 'Email', 'Position',
                        'Department', 'Group', 'Status', 'Hire Date', 'Birthdate']
      const EMP_WIDTHS = [18, 28, 32, 24, 18, 22, 12, 14, 14]
      const N = EMP_COLS.length

      const dateLabel = new Date().toLocaleDateString('en-GB',
        { day: '2-digit', month: 'short', year: 'numeric' })

      // ── Sheet 1: Employees ────────────────────────────────────────────────
      const ws1 = wb.addWorksheet('Employees', {
        views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
      })
      ws1.columns = EMP_WIDTHS.map(w => ({ width: w }))
      addTitleRow(ws1, `EMPLOYEE REPORT — ${dateLabel}`, N)

      for (const [, { group, members }] of groupedEmployees) {
        const gName = group?.name ?? 'Ungrouped'
        addSectionRow(ws1, gName, members.length, N)
        addHeaderRow(ws1, EMP_COLS)
        members.forEach((emp, i) => {
          addDataRow(ws1, [
            emp.employee_number,
            emp.full_name,
            emp.email,
            emp.position ?? '',
            emp.department ?? '',
            gName,
            STATUS_LABELS[emp.status],
            emp.hire_date ?? '',
            '',
          ], i % 2 === 1, 7)
        })
        ws1.addRow([])
      }

      // ── Sheet 2: Summary ──────────────────────────────────────────────────
      const SUM_COLS  = ['Group Name', 'Total Employees', 'Active', 'Inactive', 'On Leave']
      const SUM_WIDTHS = [28, 18, 12, 12, 12]
      const NS = SUM_COLS.length

      const ws2 = wb.addWorksheet('Summary', {
        views: [{ state: 'frozen', ySplit: 2, showGridLines: false }],
      })
      ws2.columns = SUM_WIDTHS.map(w => ({ width: w }))
      addTitleRow(ws2, `SUMMARY BY GROUP — ${dateLabel}`, NS)
      addHeaderRow(ws2, SUM_COLS)

      const dataStart = 3  // row 1 = title, row 2 = col headers
      groupedEmployees.forEach(([, { group, members }], i) => {
        const active  = members.filter(e => e.status === 'active').length
        const inactive = members.filter(e => e.status === 'inactive').length
        const onLeave  = members.filter(e => e.status === 'on_leave').length
        const row = ws2.addRow([group?.name ?? 'Ungrouped', members.length, active, inactive, onLeave])
        row.height = 16
        const bg = i % 2 === 1 ? ALTBLUE : WHITE
        for (let c = 1; c <= NS; c++) {
          const cell = row.getCell(c)
          cell.font = arial({ size: 10, color: { argb: DKTEXT } })
          cell.fill = solidFill(bg)
          cell.border = allBorders
          cell.alignment = c === 1
            ? { vertical: 'middle', horizontal: 'left', indent: 1 }
            : { vertical: 'middle', horizontal: 'center' }
        }
      })

      const dataEnd = dataStart + groupedEmployees.length - 1
      const totRow = ws2.addRow([
        'TOTAL',
        { formula: `SUM(B${dataStart}:B${dataEnd})` },
        { formula: `SUM(C${dataStart}:C${dataEnd})` },
        { formula: `SUM(D${dataStart}:D${dataEnd})` },
        { formula: `SUM(E${dataStart}:E${dataEnd})` },
      ])
      totRow.height = 20
      for (let c = 1; c <= NS; c++) {
        const cell = totRow.getCell(c)
        cell.font = arial({ bold: true, size: 10, color: { argb: LTTEXT } })
        cell.fill = solidFill(NAVY)
        cell.border = allBorders
        cell.alignment = c === 1
          ? { vertical: 'middle', horizontal: 'left', indent: 1 }
          : { vertical: 'middle', horizontal: 'center' }
      }

      // ── Sheet 3: By Department ────────────────────────────────────────────
      const ws3 = wb.addWorksheet('By Department', {
        views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
      })
      ws3.columns = EMP_WIDTHS.map(w => ({ width: w }))
      addTitleRow(ws3, `EMPLOYEES BY DEPARTMENT — ${dateLabel}`, N)

      const deptMap = new Map<string, EmployeeWithGroup[]>()
      for (const emp of filtered) {
        const dept = emp.department || 'No Department'
        if (!deptMap.has(dept)) deptMap.set(dept, [])
        deptMap.get(dept)!.push(emp)
      }
      const deptEntries = Array.from(deptMap.entries()).sort(([a], [b]) =>
        a === 'No Department' ? 1 : b === 'No Department' ? -1 : a.localeCompare(b),
      )

      for (const [dept, members] of deptEntries) {
        addSectionRow(ws3, dept, members.length, N)
        addHeaderRow(ws3, EMP_COLS)
        members.forEach((emp, i) => {
          addDataRow(ws3, [
            emp.employee_number,
            emp.full_name,
            emp.email,
            emp.position ?? '',
            emp.department ?? '',
            emp.employee_groups?.name ?? '',
            STATUS_LABELS[emp.status],
            emp.hire_date ?? '',
            '',
          ], i % 2 === 1, 7)
        })
        ws3.addRow([])
      }

      // ── Download ──────────────────────────────────────────────────────────
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `employees_export_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

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

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={filtered.length === 0 || exporting}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          {exporting ? 'Exporting…' : 'Export'}
        </button>

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
