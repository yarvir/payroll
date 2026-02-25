'use client'

import { useState, useTransition } from 'react'
import AddEmployeeModal from './AddEmployeeModal'
import { getNextEmployeeNumber } from './actions'
import type { EmployeeGroup } from '@/types/database'

interface Props {
  groups: EmployeeGroup[]
}

export default function AddEmployeeButton({ groups }: Props) {
  const [open, setOpen] = useState(false)
  const [nextNumber, setNextNumber] = useState('')
  const [loading, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const n = await getNextEmployeeNumber()
      setNextNumber(n)
      setOpen(true)
    })
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {loading ? 'Loading…' : 'Add Employee'}
      </button>

      {open && (
        <AddEmployeeModal
          groups={groups}
          defaultEmployeeNumber={nextNumber}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
