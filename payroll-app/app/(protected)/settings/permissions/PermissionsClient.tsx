'use client'

import { useState, useTransition } from 'react'
import { updatePermission } from './actions'
import { PERMISSION_LABELS } from '@/lib/permissions'
import type { PermissionKey } from '@/lib/permissions'

// ── Permission categories ─────────────────────────────────────────────────────

const PERMISSION_CATEGORIES: { label: string; keys: PermissionKey[] }[] = [
  {
    label: '👥 Employees',
    keys: [
      'view_all_employees',
      'manage_employees',
      'delete_employees',
    ],
  },
  {
    label: '🗂️ Groups',
    keys: ['manage_groups'],
  },
  {
    label: '👤 Users & Roles',
    keys: ['manage_users'],
  },
  {
    label: '📄 Contracts',
    keys: ['view_edit_contracts', 'view_salary_nonsensitive', 'view_salary_sensitive'],
  },
  {
    label: '🏖️ Leave',
    keys: ['approve_leave', 'submit_own_leave'],
  },
  {
    label: '💰 Payroll',
    keys: ['run_payroll', 'export_bank_file', 'view_payroll_history'],
  },
  {
    label: '📊 Reports',
    keys: ['view_reports'],
  },
  {
    label: '📚 Wiki',
    keys: ['read_wiki', 'write_wiki'],
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface RoleColumn {
  id: string    // role slug, e.g. 'hr'
  name: string  // display name, e.g. 'HR'
}

interface Props {
  permissions: Record<string, Record<string, boolean>>
  roles: RoleColumn[]  // all non-owner roles from DB
}

export default function PermissionsClient({ permissions: initialPermissions, roles }: Props) {
  const [permissions, setPermissions] = useState(initialPermissions)
  const [, startTransition] = useTransition()
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function getEnabled(feature: PermissionKey, roleId: string): boolean {
    return permissions[feature]?.[roleId] ?? false
  }

  function handleToggle(feature: PermissionKey, roleId: string) {
    const newEnabled = !getEnabled(feature, roleId)
    const key = `${feature}:${roleId}`

    setPermissions(prev => ({
      ...prev,
      [feature]: { ...(prev[feature] ?? {}), [roleId]: newEnabled },
    }))
    setError(null)
    setSavingKey(key)

    startTransition(async () => {
      const result = await updatePermission(feature, roleId, newEnabled)
      setSavingKey(null)
      if (result.error) {
        setError(result.error)
        setPermissions(prev => ({
          ...prev,
          [feature]: { ...(prev[feature] ?? {}), [roleId]: !newEnabled },
        }))
      }
    })
  }

  const colCount = roles.length + 1  // +1 for the feature label column

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
              {roles.map(r => (
                <th
                  key={r.id}
                  className="px-5 py-3 font-semibold text-gray-700 text-center whitespace-nowrap"
                >
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_CATEGORIES.map(category => (
              <>
                {/* Category header row */}
                <tr key={`cat-${category.label}`} className="bg-gray-50 border-t border-b border-gray-200">
                  <td
                    colSpan={colCount}
                    className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {category.label}
                  </td>
                </tr>

                {/* Permission rows for this category */}
                {category.keys.map(key => (
                  <tr key={key} className="border-b border-gray-100 hover:bg-gray-50 transition last:border-0">
                    <td className="px-5 py-3.5 text-gray-800">
                      {PERMISSION_LABELS[key]}
                    </td>
                    {roles.map(r => {
                      const cellKey = `${key}:${r.id}`
                      const enabled = getEnabled(key, r.id)
                      const saving = savingKey === cellKey

                      return (
                        <td key={r.id} className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => handleToggle(key, r.id)}
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
              </>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Owner always has all permissions and cannot be restricted. Custom roles start with all permissions off.
      </p>
    </div>
  )
}
