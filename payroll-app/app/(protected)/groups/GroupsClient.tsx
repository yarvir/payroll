'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { addGroup, updateGroup, deleteGroup } from './actions'
import type { EmployeeGroup } from '@/types/database'

interface Props {
  groups: EmployeeGroup[]
  countByGroup: Record<string, number>
  canManage: boolean
}

// ── Shared modal for add / edit ──────────────────────────────────────────────

function GroupFormModal({
  group,
  onClose,
}: {
  group?: EmployeeGroup
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = group
        ? await updateGroup(group.id, formData)
        : await addGroup(formData)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {group ? 'Edit Group' : 'Add Group'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              type="text"
              required
              defaultValue={group?.name}
              placeholder="Engineering"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              defaultValue={group?.description ?? ''}
              placeholder="Optional description…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {pending ? 'Saving…' : group ? 'Save Changes' : 'Add Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main client component ────────────────────────────────────────────────────

export default function GroupsClient({ groups, countByGroup, canManage }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<EmployeeGroup | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleDelete(group: EmployeeGroup) {
    const count = countByGroup[group.id] ?? 0
    const warning =
      count > 0
        ? ` ${count} employee${count !== 1 ? 's' : ''} will become ungrouped.`
        : ''
    if (!confirm(`Delete "${group.name}"?${warning}`)) return

    setDeleteError(null)
    setDeletingId(group.id)
    startTransition(async () => {
      const result = await deleteGroup(group.id)
      setDeletingId(null)
      if (result.error) {
        setDeleteError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div>
      {canManage && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Group
          </button>
        </div>
      )}

      {deleteError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <p className="text-gray-500 text-sm">No groups yet</p>
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Add your first group
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(group => {
            const count = countByGroup[group.id] ?? 0
            const isDeleting = deletingId === group.id

            return (
              <div
                key={group.id}
                className="relative bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:border-indigo-300 hover:shadow-sm transition"
              >
                {/* Clickable overlay — navigates to group detail */}
                <Link
                  href={`/groups/${group.id}`}
                  className="absolute inset-0 rounded-xl"
                  aria-label={`View ${group.name}`}
                />

                <div className="flex items-start justify-between gap-3">
                  {/* Icon + name + count */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {group.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {count} member{count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Actions — sit above the Link overlay via relative z-index */}
                  {canManage && (
                    <div className="relative z-10 flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setEditingGroup(group)}
                        disabled={isDeleting}
                        title="Edit"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition disabled:opacity-40"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(group)}
                        disabled={isDeleting}
                        title="Delete"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                      >
                        {isDeleting ? (
                          <svg
                            className="w-4 h-4 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8H4z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {group.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{group.description}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAddModal && <GroupFormModal onClose={() => setShowAddModal(false)} />}
      {editingGroup && (
        <GroupFormModal group={editingGroup} onClose={() => setEditingGroup(null)} />
      )}
    </div>
  )
}
