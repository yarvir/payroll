'use client'

import { useState } from 'react'
import AddEmployeeModal from './AddEmployeeModal'
import type { EmployeeGroup } from '@/types/database'

interface Props {
  groups: EmployeeGroup[]
  viewSensitive: boolean
}

export default function AddEmployeeButton({ groups, viewSensitive }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Employee
      </button>

      {open && (
        <AddEmployeeModal
          groups={groups}
          viewSensitive={viewSensitive}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
