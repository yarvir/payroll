'use client'

import { useState, useTransition } from 'react'
import { updatePermission } from './actions'
import { PERMISSION_LABELS, ALL_PERMISSION_KEYS } from '@/lib/permissions'
import type { PermissionKey } from '@/lib/permissions'
import type { UserRole } from '@/types/database'

const CONFIGURABLE_ROLES: { role: UserRole; label: string }[] = [
  { role: 'hr',        label: 'HR' },
  { role: 'accountant', label: 'Accountant' },
  { role: 'employee',  label: 'Employee' },
]

interface Props {
  // permissions[feature][role] = enabled
  permissions: Record<string, Record<string, boolean>>
}

export default function PermissionsClient({ permissions: initialPermissions }: Props) {
  const [permissions, setPermissions] = useState(initialPermissions)
  const [, startTransition] = useTransition()
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function getEnabled(feature: PermissionKey, role: UserRole): boolean {
    return permissions[feature]?.[role] ?? false
  }

  function handleToggle(feature: PermissionKey, role: UserRole) {
    const newEnabled = !getEnabled(feature, role)
    const key = `${feature}:${role}`

    // Optimistic update
    setPermissions(prev => ({
      ...prev,
      [feature]: { ...(prev[feature] ?? {}), [role]: newEnabled },
    }))
    setError(null)
    setSavingKey(key)

    startTransition(async () => {
      const result = await updatePermission(feature, role, newEnabled)
      setSavingKey(null)
      if (result.error) {
        setError(result.error)
        // Revert optimistic update
        setPermissions(prev => ({
          ...prev,
          [feature]: { ...(prev[feature] ?? {}), [role]: !newEnabled },
        }))
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
              <th className="text-left px-5 py-3 font-semibold text-gray-700 w-full">
                Feature / Action
              </th>
              {CONFIGURABLE_ROLES.map(({ role, label }) => (
                <th
                  key={role}
                  className="px-5 py-3 font-semibold text-gray-700 text-center whitespace-nowrap"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ALL_PERMISSION_KEYS.map(key => (
              <tr key={key} className="hover:bg-gray-50 transition">
                <td className="px-5 py-3.5 text-gray-800">
                  {PERMISSION_LABELS[key]}
                </td>
                {CONFIGURABLE_ROLES.map(({ role }) => {
                  const cellKey = `${key}:${role}`
                  const enabled = getEnabled(key, role)
                  const saving = savingKey === cellKey

                  return (
                    <td key={role} className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggle(key, role)}
                        disabled={saving}
                        title={enabled ? 'Click to revoke' : 'Click to grant'}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-60 ${
                          enabled ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            enabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Owner always has all permissions and cannot be restricted.
      </p>
    </div>
  )
}
