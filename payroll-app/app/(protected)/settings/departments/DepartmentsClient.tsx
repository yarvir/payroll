'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createDepartment, updateDepartment, deleteDepartment } from './actions'
import type { Department } from '@/types/database'

interface Props {
  departments: Department[]
}

export default function DepartmentsClient({ departments }: Props) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const editInputRef = useRef<HTMLInputElement>(null)
  const newInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus()
  }, [editingId])

  useEffect(() => {
    if (addingNew && newInputRef.current) newInputRef.current.focus()
  }, [addingNew])

  function startEdit(dept: Department) {
    setEditingId(dept.id)
    setEditName(dept.name)
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
  }

  function handleSaveEdit(id: string) {
    setError(null)
    const formData = new FormData()
    formData.set('name', editName)
    startTransition(async () => {
      const result = await updateDepartment(id, formData)
      if (result.error) {
        setError(result.error)
      } else {
        setEditingId(null)
        router.refresh()
      }
    })
  }

  function handleDelete(id: string) {
    setError(null)
    setDeleteConfirmId(null)
    startTransition(async () => {
      const result = await deleteDepartment(id)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleCreate() {
    setError(null)
    const formData = new FormData()
    formData.set('name', newName)
    startTransition(async () => {
      const result = await createDepartment(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setAddingNew(false)
        setNewName('')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 font-semibold text-gray-700">Department Name</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-700">Type</th>
              <th className="px-5 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {departments.map(dept => (
              <tr key={dept.id} className="hover:bg-gray-50 transition">
                {/* Name cell */}
                <td className="px-5 py-3">
                  {editingId === dept.id ? (
                    <input
                      ref={editInputRef}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit(dept.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      className="px-2 py-1 border border-indigo-400 rounded-md text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <span className="text-gray-900 font-medium">{dept.name}</span>
                  )}
                </td>

                {/* Type badge */}
                <td className="px-5 py-3">
                  {dept.type === 'builtin' ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      Built-in
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      Custom
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-5 py-3 text-right">
                  {deleteConfirmId === dept.id ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-gray-500">Delete this department?</span>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        disabled={pending}
                        className="text-xs font-medium px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-xs font-medium px-2 py-1 rounded text-gray-600 hover:bg-gray-100 transition"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : editingId === dept.id ? (
                    <span className="inline-flex items-center gap-2">
                      <button
                        onClick={() => handleSaveEdit(dept.id)}
                        disabled={pending || !editName.trim()}
                        className="text-xs font-medium px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs font-medium px-2 py-1 rounded text-gray-600 hover:bg-gray-100 transition"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <button
                        onClick={() => startEdit(dept)}
                        className="text-xs font-medium px-2 py-1 rounded text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition"
                      >
                        Rename
                      </button>
                      {dept.type === 'custom' && (
                        <button
                          onClick={() => { setDeleteConfirmId(dept.id); setError(null) }}
                          className="text-xs font-medium px-2 py-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {/* Inline add-new row */}
            {addingNew && (
              <tr className="bg-indigo-50/40">
                <td className="px-5 py-3" colSpan={2}>
                  <input
                    ref={newInputRef}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreate()
                      if (e.key === 'Escape') { setAddingNew(false); setNewName('') }
                    }}
                    placeholder="e.g. Legal"
                    className="px-2 py-1 border border-indigo-400 rounded-md text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="inline-flex items-center gap-2">
                    <button
                      onClick={handleCreate}
                      disabled={pending || !newName.trim()}
                      className="text-xs font-medium px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingNew(false); setNewName('') }}
                      className="text-xs font-medium px-2 py-1 rounded text-gray-600 hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add department button */}
      {!addingNew && (
        <button
          onClick={() => { setAddingNew(true); setError(null) }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Custom Department
        </button>
      )}

      <p className="text-xs text-gray-400">
        Built-in departments can be renamed but not deleted. Custom departments can be deleted only if no employees are assigned to them.
      </p>
    </div>
  )
}
