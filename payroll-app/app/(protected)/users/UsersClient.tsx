'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deactivateUser, reactivateUser, deleteUser } from './actions'
import InviteUserModal from './InviteUserModal'
import EditUserModal from './EditUserModal'
import { getRoleLabel, getRoleColor } from '@/lib/roles'
import type { Employee, Profile, Role } from '@/types/database'

export type UserRow = {
  id: string
  email: string
  last_sign_in_at: string | null
  created_at: string
  banned: boolean
  profile: Profile | null
  linked_employee: Pick<
    Employee,
    'id' | 'full_name' | 'employee_number' | 'profile_id'
  > | null
}

interface Props {
  userRows: UserRow[]
  employees: Pick<Employee, 'id' | 'full_name' | 'employee_number' | 'profile_id'>[]
  roles: Pick<Role, 'id' | 'name'>[]
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function UsersClient({ userRows, employees, roles }: Props) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UserRow | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleToggleBan(row: UserRow) {
    setActionError(null)
    startTransition(async () => {
      try {
        const result = row.banned
          ? await reactivateUser(row.id)
          : await deactivateUser(row.id)
        if (result?.error) {
          setActionError(result.error)
        } else {
          router.refresh()
        }
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'An unexpected error occurred.')
      }
    })
  }

  function handleDelete(userId: string) {
    setActionError(null)
    setDeleteConfirmId(null)
    startTransition(async () => {
      try {
        const result = await deleteUser(userId)
        if (result?.error) {
          setActionError(result.error)
        } else {
          router.refresh()
        }
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'An unexpected error occurred.')
      }
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">
            {userRows.length} total user{userRows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invite User
        </button>
      </div>

      {actionError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Name / Email
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Linked Employee
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Last Sign In
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {userRows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-gray-400"
                  >
                    No users found.
                  </td>
                </tr>
              )}
              {userRows.map((row) => (
                <tr
                  key={row.id}
                  className={row.banned ? 'opacity-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {row.profile?.full_name ?? (
                        <span className="text-gray-400 italic">No name</span>
                      )}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">{row.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {row.profile ? (
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${getRoleColor(row.profile.role)}`}
                      >
                        {roles.find(r => r.id === row.profile!.role)?.name ?? getRoleLabel(row.profile.role)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No profile</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.linked_employee ? (
                      <div>
                        <div className="text-gray-900">{row.linked_employee.full_name}</div>
                        <div className="text-gray-400 text-xs">
                          {row.linked_employee.employee_number}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(row.last_sign_in_at)}
                  </td>
                  <td className="px-4 py-3">
                    {row.banned ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                        Deactivated
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {deleteConfirmId === row.id ? (
                        <>
                          <span className="text-xs text-gray-500">Delete permanently?</span>
                          <button
                            onClick={() => handleDelete(row.id)}
                            disabled={pending}
                            className="text-xs font-medium px-2 py-1 rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition"
                          >
                            Yes, delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-xs font-medium px-2 py-1 rounded text-gray-600 hover:bg-gray-100 transition"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditTarget(row)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleBan(row)}
                            disabled={pending}
                            className={`text-xs font-medium px-2 py-1 rounded transition disabled:opacity-50 ${
                              row.banned
                                ? 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                            }`}
                          >
                            {row.banned ? 'Reactivate' : 'Deactivate'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(row.id)}
                            disabled={pending}
                            className="text-xs font-medium px-2 py-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {inviteOpen && (
        <InviteUserModal
          employees={employees}
          roles={roles}
          onClose={() => setInviteOpen(false)}
        />
      )}
      {editTarget && (
        <EditUserModal
          user={editTarget}
          employees={employees}
          roles={roles}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
