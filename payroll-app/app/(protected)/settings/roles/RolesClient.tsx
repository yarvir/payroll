'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createRole, updateRole, deleteRole } from './actions'
import type { Role } from '@/types/database'

interface Props {
  roles: Role[]
}

export default function RolesClient({ roles }: Props) {
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

  function startEdit(role: Role) {
    setEditingId(role.id)
    setEditName(role.name)
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
      const result = await updateRole(id, formData)
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
      const result = await deleteRole(id)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleCreateRole() {
    setError(null)
    const formData = new FormData()
    formData.set('name', newName)
    startTransition(async () => {
      const result = await createRole(formData)
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
              <th className="text-left px-5 py-3 font-semibold text-gray-700">Role Name</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-700">Type</th>
              <th className="px-5 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {roles.map(role => (
              <tr key={role.id} className="hover:bg-gray-50 transition">
                {/* Name cell — inline edit when editing */}
                <td className="px-5 py-3">
                  {editingId === role.id ? (
                    <input
                      ref={editInputRef}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit(role.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      className="px-2 py-1 border border-indigo-400 rounded-md text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <span className="text-gray-900 font-medium">{role.name}</span>
                  )}
                </td>

                {/* Type badge */}
                <td className="px-5 py-3">
                  {role.is_default ? (
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
                  {deleteConfirmId === role.id ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-gray-500">Delete this role?</span>
                      <button
                        onClick={() => handleDelete(role.id)}
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
                  ) : editingId === role.id ? (
                    <span className="inline-flex items-center gap-2">
                      <button
                        onClick={() => handleSaveEdit(role.id)}
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
                        onClick={() => startEdit(role)}
                        className="text-xs font-medium px-2 py-1 rounded text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition"
                      >
                        Rename
                      </button>
                      {!role.is_default && (
                        <button
                          onClick={() => { setDeleteConfirmId(role.id); setError(null) }}
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
                      if (e.key === 'Enter') handleCreateRole()
                      if (e.key === 'Escape') { setAddingNew(false); setNewName('') }
                    }}
                    placeholder="e.g. Finance Manager"
                    className="px-2 py-1 border border-indigo-400 rounded-md text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="inline-flex items-center gap-2">
                    <button
                      onClick={handleCreateRole}
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

      {/* Add role button */}
      {!addingNew && (
        <button
          onClick={() => { setAddingNew(true); setError(null) }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Custom Role
        </button>
      )}

      <p className="text-xs text-gray-400">
        Built-in roles can be renamed but not deleted. Custom roles can be deleted only if no users are assigned to them.
      </p>
    </div>
  )
}
